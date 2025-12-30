import {
  ApolloGateway,
  IntrospectAndCompose,
  RemoteGraphQLDataSource,
} from '@apollo/gateway';
import { ApolloServer, BaseContext } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

type Subgraph = { name: string; url: string };

class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  log(message: string) {
    console.log(`[${this.name}] ${message}`);
  }

  error(message: string) {
    console.error(`[${this.name}] ${message}`);
  }

  debug(message: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${this.name}] ${message}`);
    }
  }
}

export class Gateway {
  private readonly logger = new Logger('Gateway');
  private gateway!: ApolloGateway;
  private server!: ApolloServer<BaseContext>;

  /**
   * 서브그래프 서비스 목록 가져오기
   */
  private getSubgraphServices(): Subgraph[] {
    const authServiceUrl =
      process.env.AUTH_SERVICE_URL ?? 'http://127.0.0.1:3300/auth/graphql';

    const accountServiceUrl =
      process.env.ACCOUNT_SERVICE_URL ??
      'http://127.0.0.1:2800/account/graphql';

    const matchServiceUrl =
      process.env.MATCH_SERVICE_URL ??
      'http://127.0.0.1:3001/match/graphql';

    const services: Subgraph[] = [
      { name: 'auth', url: authServiceUrl },
      { name: 'account', url: accountServiceUrl },
      { name: 'match', url: matchServiceUrl },
      // { name: 'chat', url: process.env.CHAT_SERVICE_URL },
    ];

    return services.filter((s) => !!s.url);
  }

  /**
   * 서브그래프 로깅
   */
  private logSubgraphs(subgraphs: Subgraph[]): void {
    this.logger.log(
      `Initializing Apollo Gateway with ${subgraphs.length} subgraph(s): ` +
        subgraphs.map((s) => `${s.name} (${s.url})`).join(', '),
    );

    subgraphs.forEach((s) =>
      this.logger.log(`Subgraph service: ${s.name} -> ${s.url}`),
    );
  }

  /**
   * 개발/디버그용 서브그래프 헬스 체크
   */
  private async probeSubgraphs(subgraphs: Subgraph[]): Promise<void> {
    this.logger.log('Probing subgraphs (connectivity & _service.sdl)...');

    await Promise.all(
      subgraphs.map(async (service) => {
        try {
          await this.runProbeQuery(
            service,
            '[1/2] connection test',
            '{ __typename }',
          );
          await this.runProbeQuery(
            service,
            '[2/2] _service { sdl }',
            'query { _service { sdl } }',
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `✗ Error probing subgraph ${service.name} at ${service.url}: ${message}`,
          );
        }
      }),
    );

    this.logger.log('Subgraph probing finished');
  }

  private async runProbeQuery(
    service: Subgraph,
    label: string,
    query: string,
  ): Promise<void> {
    const { name, url } = service;
    this.logger.log(`${name}: ${label}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        // Apollo Server CSRF prevention 우회 (gateway 내부 호출은 브라우저 preflight가 없음)
        'apollo-require-preflight': 'true',
        'x-apollo-operation-name': 'gateway-probe',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(
        `${name}: ${label} failed – ${res.status} ${res.statusText}`,
      );
      this.logger.error(body.substring(0, 1000));
      return;
    }

    const json = await res.json();
    if (json.errors) {
      this.logger.error(
        `${name}: ${label} GraphQL errors: ${JSON.stringify(json.errors)}`,
      );
      return;
    }

    this.logger.log(`${name}: ${label} ✓`);
  }

  /**
   * Apollo Gateway 생성
   */
  private createGateway(subgraphs: Subgraph[]): ApolloGateway {
    return new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs,
        subgraphHealthCheck: false,
        pollIntervalInMs: 10_000,
      }),
      buildService: ({ name, url }) =>
        new RemoteGraphQLDataSource({
          url,
          willSendRequest: ({ request, context }) => {
            this.logger.debug(`Sending request to ${name} at ${url}`);

            if (!request.http?.headers) return;

            // CSRF 우회용
            request.http.headers.set('X-Requested-With', 'XMLHttpRequest');
            request.http.headers.set('apollo-require-preflight', 'true');
            if (!request.http.headers.has('x-apollo-operation-name')) {
              request.http.headers.set('x-apollo-operation-name', 'gateway');
            }

            // context.headers 를 최대한 그대로 전달
            // - express req.headers는 (string | string[] | undefined) 형태일 수 있음
            // - hop-by-hop 헤더는 제거 (upstream에서 문제를 일으킬 수 있음)
            const hopByHop = new Set([
              'connection',
              'keep-alive',
              'proxy-authenticate',
              'proxy-authorization',
              'te',
              'trailer',
              'transfer-encoding',
              'upgrade',
              'content-length',
              'host',
            ]);

            if (context?.headers && typeof context.headers === 'object') {
              Object.entries(context.headers).forEach(([key, value]) => {
                const k = String(key).toLowerCase();
                if (hopByHop.has(k)) return;
                if (value === undefined || value === null) return;

                // express header value can be string | string[]
                const v = Array.isArray(value) ? value.join(',') : String(value);
                if (!v) return;
                request.http!.headers.set(key, v);
              });
            }

            // ensure required headers still present even if context overwrote them
            request.http.headers.set('apollo-require-preflight', 'true');
          },
        }),
    });
  }

  /**
   * Apollo Server 생성
   */
  private async createApolloServer(
    gateway: ApolloGateway,
  ): Promise<ApolloServer<BaseContext>> {
    this.logger.log(`APOLLO_ENABLE_SANDBOX: ${process.env.APOLLO_ENABLE_SANDBOX}`);
    this.logger.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    const enableSandbox =
      process.env.APOLLO_ENABLE_SANDBOX === 'true' ||
      process.env.NODE_ENV !== 'production';

    const server = new ApolloServer<BaseContext>({
      gateway,
      introspection: true,
      plugins: enableSandbox
        ? [
            ApolloServerPluginLandingPageLocalDefault({
              embed: true,
              includeCookies: false,
            }),
          ]
        : [],
    });

    this.logger.log(
      'Starting ApolloServer (gateway will be loaded automatically)...',
    );
    if (enableSandbox) {
      this.logger.log(
        process.env.NODE_ENV !== 'production'
          ? 'Apollo Sandbox is enabled for development'
          : 'Apollo Sandbox is enabled for production (APOLLO_ENABLE_SANDBOX=true)',
      );
    }
    await server.start();
    this.logger.log('ApolloServer started successfully');

    return server;
  }

  /**
   * Gateway 초기화
   */
  async initialize(): Promise<void> {
    this.logger.log('Gateway initialization started');

    const subgraphs = this.getSubgraphServices();
    if (!subgraphs.length) {
      throw new Error(
        'No subgraph services configured. At least one subgraph service URL must be set.',
      );
    }

    this.logSubgraphs(subgraphs);

    // 개발환경에서만 서브그래프 헬스 체크
    if (process.env.NODE_ENV !== 'production') {
      await this.probeSubgraphs(subgraphs);
    }

    this.gateway = this.createGateway(subgraphs);
    this.server = await this.createApolloServer(this.gateway);
    this.logger.log('Gateway initialization completed');
  }

  /**
   * Gateway 종료
   */
  async shutdown(): Promise<void> {
    if (this.server) {
      await this.server.stop();
    }
    if (this.gateway) {
      await this.gateway.stop();
    }
    this.logger.log('Gateway shutdown completed');
  }

  /**
   * Apollo Server 인스턴스 가져오기
   */
  getServer(): ApolloServer<BaseContext> {
    return this.server;
  }

  /**
   * Apollo Gateway 인스턴스 가져오기
   */
  getGateway(): ApolloGateway {
    return this.gateway;
  }
}

