import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { ENV_KEY } from '../config/env.config';

@Injectable()
export class GatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayService.name);
  private gateway: ApolloGateway;
  private server: ApolloServer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // 서브그래프 서비스 목록 가져오기
    const subgraphServices = this.getSubgraphServices();

    // 서브그래프가 없으면 에러
    if (subgraphServices.length === 0) {
      throw new Error(
        'No subgraph services configured. At least one subgraph service URL must be set.',
      );
    }

    this.logger.log(
      `Initializing Apollo Gateway with ${subgraphServices.length} subgraph(s): ${subgraphServices.map((s) => s.name).join(', ')}`,
    );

    // Apollo Gateway 초기화
    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs: subgraphServices,
        subgraphHealthCheck: true,
        pollIntervalInMs: 10000, // 10초마다 스키마 업데이트 확인
      }),
    });

    // Gateway 서버 시작 (재시도 로직 포함)
    await this.loadGatewayWithRetry();

    // Apollo Server 초기화
    this.server = new ApolloServer({
      gateway: this.gateway,
      introspection: true,
      plugins: [
        {
          async requestDidStart() {
            return {
              async didResolveOperation(requestContext) {
                // 요청 로깅
                if (requestContext.request.operationName) {
                  console.log(
                    `[Gateway] Operation: ${requestContext.request.operationName}`,
                  );
                }
              },
            };
          },
        },
      ],
    });

    await this.server.start();
  }

  async onModuleDestroy() {
    if (this.server) {
      await this.server.stop();
    }
    if (this.gateway) {
      await this.gateway.stop();
    }
  }

  getServer(): ApolloServer {
    return this.server;
  }

  /**
   * Gateway를 재시도 로직과 함께 로드
   */
  private async loadGatewayWithRetry(
    maxRetries: number = 5,
    retryDelay: number = 5000,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Attempting to load gateway (attempt ${attempt}/${maxRetries})...`,
        );
        await this.gateway.load();
        this.logger.log('Gateway loaded successfully');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Failed to load gateway (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );

        if (attempt < maxRetries) {
          this.logger.log(
            `Retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 모든 재시도 실패
    this.logger.error(
      `Failed to load gateway after ${maxRetries} attempts. Last error: ${lastError?.message}`,
    );
    throw new Error(
      `Gateway initialization failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private getSubgraphServices(): Array<{ name: string; url: string }> {
    // 환경변수에서 서브그래프 서비스 URL 가져오기
    const authServiceUrl =
      this.configService.get<string>(ENV_KEY.AUTH_SERVICE_URL) ||
      'http://localhost:2799/auth/graphql';
    // const accountServiceUrl =
    //   this.configService.get<string>(ENV_KEY.ACCOUNT_SERVICE_URL) ||
    //   'http://localhost:3001/graphql';
    // const matchServiceUrl =
    //   this.configService.get<string>(ENV_KEY.MATCH_SERVICE_URL) ||
    //   'http://localhost:3002/graphql';
    // const chatServiceUrl =
    //   this.configService.get<string>(ENV_KEY.CHAT_SERVICE_URL) ||
    //   'http://localhost:3003/graphql';

    const services = [
      { name: 'auth', url: authServiceUrl },
      // { name: 'account', url: accountServiceUrl },
      // { name: 'match', url: matchServiceUrl },
      // { name: 'chat', url: chatServiceUrl },
    ];

    // 필터링: URL이 설정된 서비스만 포함
    return services.filter((service) => service.url);
  }
}

