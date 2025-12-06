import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { ENV_KEY } from '../config/env.config';

@Injectable()
export class GatewayService implements OnModuleInit, OnModuleDestroy {
  private gateway: ApolloGateway;
  private server: ApolloServer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // 서브그래프 서비스 목록 가져오기
    const subgraphServices = this.getSubgraphServices();

    // Apollo Gateway 초기화
    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs: subgraphServices,
        subgraphHealthCheck: true,
        pollIntervalInMs: 10000, // 10초마다 스키마 업데이트 확인
      }),
    });

    // Gateway 서버 시작
    await this.gateway.load();

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

  private getSubgraphServices(): Array<{ name: string; url: string }> {
    // 환경변수에서 서브그래프 서비스 URL 가져오기
    const authServiceUrl =
      this.configService.get<string>(ENV_KEY.AUTH_SERVICE_URL) ||
      'http://localhost:3000/graphql';
    const accountServiceUrl =
      this.configService.get<string>(ENV_KEY.ACCOUNT_SERVICE_URL) ||
      'http://localhost:3001/graphql';
    const matchServiceUrl =
      this.configService.get<string>(ENV_KEY.MATCH_SERVICE_URL) ||
      'http://localhost:3002/graphql';
    const chatServiceUrl =
      this.configService.get<string>(ENV_KEY.CHAT_SERVICE_URL) ||
      'http://localhost:3003/graphql';

    const services = [
      { name: 'auth', url: authServiceUrl },
      { name: 'account', url: accountServiceUrl },
      { name: 'match', url: matchServiceUrl },
      { name: 'chat', url: chatServiceUrl },
    ];

    // 필터링: URL이 설정된 서비스만 포함
    return services.filter((service) => service.url);
  }
}

