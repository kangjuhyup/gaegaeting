import { Module } from '@nestjs/common';
import { MessageService } from './application/service/message.service.js';
import { MessageRepositoryPort } from './application/port/message-repository.port.js';
import { MessagePostgresRepository } from './infrastructure/persistence/message.postgres.repository.js';
import { MessageResolver } from './infrastructure/graphql/message.resolver.js';
import { RoomModule } from '../room/room.module.js';
@Module({ imports: [RoomModule], providers: [MessageService, MessageResolver, { provide: MessageRepositoryPort, useClass: MessagePostgresRepository }], exports: [MessageRepositoryPort] })
export class MessageModule {}
