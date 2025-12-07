import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { ENV_KEY } from '../config/env.config';

@Injectable()
export class GatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayService.name);
  private gateway: ApolloGateway;
  private server: ApolloServer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // 즉시 출력을 위해 console.log도 사용
      console.log('[GatewayService] onModuleInit() started');
      this.logger.log('GatewayService.onModuleInit() started');
      
      // 서브그래프 서비스 목록 가져오기
      console.log('[GatewayService] Getting subgraph services...');
      const subgraphServices = this.getSubgraphServices();
      console.log(`[GatewayService] Found ${subgraphServices.length} subgraph service(s)`);

      // 서브그래프가 없으면 에러
      if (subgraphServices.length === 0) {
        throw new Error(
          'No subgraph services configured. At least one subgraph service URL must be set.',
        );
      }

      this.logger.log(
        `Initializing Apollo Gateway with ${subgraphServices.length} subgraph(s): ${subgraphServices.map((s) => `${s.name} (${s.url})`).join(', ')}`,
      );

      // 서브그래프 URL 로깅
      subgraphServices.forEach((service) => {
        this.logger.log(`Subgraph service: ${service.name} -> ${service.url}`);
      });

      // 서브그래프 연결 테스트 및 스키마 확인
      console.log('[GatewayService] Testing subgraph connectivity and fetching schemas...');
      this.logger.log('Testing subgraph connectivity and fetching schemas...');
      for (const service of subgraphServices) {
        try {
          console.log(`[GatewayService] [1/2] Testing connection to ${service.name} at ${service.url}...`);
          this.logger.log(`[1/2] Testing connection to ${service.name} at ${service.url}...`);
          
          // 타임아웃 설정을 위한 AbortController
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
          
          const testResponse = await fetch(service.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              query: 'query { __typename }',
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            this.logger.error(
              `✗ Connection test failed for ${service.name}: ${testResponse.status} ${testResponse.statusText}`,
            );
            this.logger.error(`Response: ${errorText.substring(0, 500)}`);
          } else {
            this.logger.log(`✓ Connection test passed for ${service.name}`);
          }

          console.log(`[GatewayService] [2/2] Fetching introspection schema from ${service.name}...`);
          this.logger.log(`[2/2] Fetching introspection schema from ${service.name}...`);
          
          // 타임아웃 설정을 위한 AbortController
          const introspectionController = new AbortController();
          const introspectionTimeoutId = setTimeout(() => introspectionController.abort(), 10000); // 10초 타임아웃
          
          const introspectionResponse = await fetch(service.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              query: `
                query IntrospectSubgraph {
                  __schema {
                    queryType {
                      name
                    }
                    types {
                      kind
                      name
                    }
                  }
                }
              `,
            }),
            signal: introspectionController.signal,
          });
          
          clearTimeout(introspectionTimeoutId);

          if (!introspectionResponse.ok) {
            const errorText = await introspectionResponse.text();
            this.logger.error(
              `✗ Introspection failed for ${service.name}: ${introspectionResponse.status} ${introspectionResponse.statusText}`,
            );
            this.logger.error(`Response: ${errorText.substring(0, 500)}`);
          } else {
            const result = await introspectionResponse.json();
            if (result.errors) {
              this.logger.error(`✗ GraphQL errors from ${service.name}:`, result.errors);
            } else {
              this.logger.log(`✓ Successfully fetched introspection from ${service.name}`);
            }
          }

          // IntrospectAndCompose가 사용하는 _service { sdl } 쿼리 테스트
          console.log(`[GatewayService] [3/3] Testing _service { sdl } query (used by IntrospectAndCompose)...`);
          this.logger.log(`[3/3] Testing _service { sdl } query (used by IntrospectAndCompose)...`);
          
          const serviceController = new AbortController();
          const serviceTimeoutId = setTimeout(() => serviceController.abort(), 10000);
          
          const serviceResponse = await fetch(service.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // IntrospectAndCompose는 헤더를 보내지 않을 수 있으므로 헤더 없이도 테스트
            },
            body: JSON.stringify({
              query: `
                query {
                  _service {
                    sdl
                  }
                }
              `,
            }),
            signal: serviceController.signal,
          });
          
          clearTimeout(serviceTimeoutId);

          if (!serviceResponse.ok) {
            const errorText = await serviceResponse.text();
            this.logger.error(
              `✗ _service { sdl } query failed for ${service.name}: ${serviceResponse.status} ${serviceResponse.statusText}`,
            );
            this.logger.error(`Response body: ${errorText.substring(0, 1000)}`);
            console.error(`[GatewayService] ERROR: _service query failed - this is what IntrospectAndCompose will receive!`);
            console.error(`[GatewayService] Status: ${serviceResponse.status}`);
            console.error(`[GatewayService] Response: ${errorText.substring(0, 1000)}`);
          } else {
            const result = await serviceResponse.json();
            if (result.errors) {
              this.logger.error(`✗ GraphQL errors from _service query:`, result.errors);
              console.error(`[GatewayService] GraphQL errors:`, JSON.stringify(result.errors, null, 2));
            } else {
              this.logger.log(`✓ Successfully fetched _service { sdl } from ${service.name}`);
              console.log(`[GatewayService] ✓ _service query succeeded`);
            }
          }
        } catch (error) {
          this.logger.error(
            `✗ Error testing ${service.name} at ${service.url}: ${error instanceof Error ? error.message : String(error)}`,
          );
          if (error instanceof Error && error.stack) {
            this.logger.error(`Stack: ${error.stack}`);
          }
        }
      }

      this.logger.log('Creating ApolloGateway instance with IntrospectAndCompose...');
      this.logger.log('NOTE: IntrospectAndCompose will now send introspection requests to subgraphs.');
      // Apollo Gateway 초기화
      this.gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: subgraphServices,
          subgraphHealthCheck: false,
          pollIntervalInMs: 10000,
        }),
        // 서브그래프 요청 시 커스텀 헤더 추가
        buildService: ({ name, url }) => {
          const service = this;
          service.logger.log(`Building service for ${name} at ${url}`);
          return new RemoteGraphQLDataSource({
            url,
            // 서브그래프에 요청을 보낼 때 헤더 추가
            willSendRequest({ request, context }) {
              service.logger.debug(`Sending request to ${name} at ${url}`);
              // CSRF 보호를 우회하기 위한 헤더
              if (request.http?.headers) {
                request.http.headers.set('X-Requested-With', 'XMLHttpRequest');
                
                // Context에서 헤더 전달 (있는 경우)
                if (context?.headers) {
                  Object.entries(context.headers).forEach(([key, value]) => {
                    if (value && typeof value === 'string') {
                      request.http.headers.set(key, value);
                    }
                  });
                }
              }
            },
          });
        },
      });

      this.logger.log('Creating ApolloServer instance...');
      // Apollo Server 초기화
      // 주의: ApolloServer.start()가 자동으로 gateway.load()를 호출하므로
      // 명시적으로 gateway.load()를 호출하지 않습니다
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

      this.logger.log('Starting ApolloServer (this will automatically load the gateway)...');
      // ApolloServer.start()가 내부적으로 gateway.load()를 호출합니다
      await this.server.start();
      this.logger.log('ApolloServer started successfully!');
      this.logger.log('GatewayService.onModuleInit() completed');
    } catch (error) {
      this.logger.error(`Error in onModuleInit(): ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
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
        this.logger.log('Calling gateway.load() - this will send introspection requests to subgraphs...');
        await this.gateway.load();
        this.logger.log('Gateway loaded successfully');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(
          `Failed to load gateway (attempt ${attempt}/${maxRetries}): ${lastError.message}`,
        );
        
        // 에러 스택도 로깅
        if (lastError.stack) {
          this.logger.error(`Error stack: ${lastError.stack}`);
        }
        
        // 에러의 cause도 확인
        if (lastError instanceof Error && 'cause' in lastError && lastError.cause) {
          this.logger.error(`Error cause: ${lastError.cause}`);
        }

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
    if (lastError?.stack) {
      this.logger.error(`Error stack: ${lastError.stack}`);
    }
    throw new Error(
      `Gateway initialization failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private getSubgraphServices(): Array<{ name: string; url: string }> {
    // 환경변수에서 서브그래프 서비스 URL 가져오기
    const authServiceUrl =
      this.configService.get<string>(ENV_KEY.AUTH_SERVICE_URL) ||
      'http://127.0.0.1:3300/auth/graphql';
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

