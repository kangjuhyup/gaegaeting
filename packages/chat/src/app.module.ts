import { Module, Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InternalAuthModule } from '@core/auth';
import { HttpLoggerModule } from '@core/logger';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, type ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ChatEventsResolver } from './common/infrastructure/chat-events.resolver.js';
import { ChatRealtimeService } from './common/application/chat-realtime.service.js';
import { ChatEventsPort } from './common/application/port/chat-events.port.js';
import { PostgresChatEvents } from './common/infrastructure/postgres-chat.events.js';
import { RoomModule } from './room/room.module.js';
import { MessageModule } from './message/message.module.js';
import { ParticipantModule } from './participant/participant.module.js';
import { ChatPostgresModule } from './common/infrastructure/postgres.module.js';
import { ChatPostgresConnection } from './common/infrastructure/postgres-connection.js';
import { validationSchema } from './config.js';

@Controller('health')
class HealthController {
  constructor(private readonly database: ChatPostgresConnection) {}
  @Get() health() { return { ok: true }; }
  @Get('ready') async ready() {
    try { await this.database.pool.query('select 1'); return { ok: true }; }
    catch { throw new ServiceUnavailableException('Chat database unavailable'); }
  }
}
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema,
    validationOptions: { allowUnknown: true, abortEarly: false } }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver, autoSchemaFile: { federation: 2 }, sortSchema: true,
      path: '/chat/graphql', playground: false, introspection: true,
      subscriptions: { 'graphql-ws': { connectionInitWaitTimeout: 5000 } },
      context: ({ req, extra }, _id, payload) => ({ req: req ?? { headers: {
        'x-gaegaeting-principal': payload?.extensions?.internalAssertion ?? extra?.request?.headers?.['x-gaegaeting-principal'],
      } } }),
      formatError: error => {
        const original = error.extensions?.originalError as { statusCode?: number } | undefined;
        const code = error.extensions?.code;
        const allowed = (original?.statusCode && original.statusCode < 500) ||
          ['BAD_USER_INPUT', 'GRAPHQL_VALIDATION_FAILED', 'GRAPHQL_PARSE_FAILED', 'UNAUTHENTICATED', 'FORBIDDEN'].includes(String(code));
        return { message: allowed ? error.message : '채팅 처리 중 오류가 발생했습니다.',
          extensions: { code: allowed ? code : 'INTERNAL_SERVER_ERROR',
            ...(original?.statusCode && original.statusCode < 500 ? { statusCode: original.statusCode } : {}) } };
      },
    }),
    HttpLoggerModule.forRoot({ name: 'Chat-API', level: process.env.LOG_LEVEL || 'info' }),
    InternalAuthModule.forRootAsync({ imports: [ConfigModule], inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow('INTERNAL_AUTH_ASSERTION_SECRET'),
        issuer: 'gaegaeting-gateway', audience: 'chat' }) }),
    ChatPostgresModule, RoomModule, MessageModule, ParticipantModule,
  ],
  controllers: [HealthController],
  providers: [ChatEventsResolver, ChatRealtimeService,
    { provide: ChatEventsPort, useClass: PostgresChatEvents },
  ],
})
export class AppModule {}
