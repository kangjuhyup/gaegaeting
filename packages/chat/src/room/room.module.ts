import { Module } from '@nestjs/common';
import { RoomService } from './application/service/room.service.js';
import { RoomRepositoryPort } from './application/port/room-repository.port.js';
import { RoomPostgresRepository } from './infrastructure/persistence/room.postgres.repository.js';
import { RoomResolver } from './infrastructure/graphql/room.resolver.js';
import { MatchPairsPort } from './application/port/match-pairs.port.js';
import { MatchPairsClient } from './infrastructure/api/match-pairs.client.js';
import { PairEventsConsumer } from './infrastructure/event/pair-events.consumer.js';
@Module({ imports: [], providers: [RoomService, RoomResolver, { provide: RoomRepositoryPort, useClass: RoomPostgresRepository }, { provide: MatchPairsPort, useClass: MatchPairsClient }, PairEventsConsumer], exports: [RoomRepositoryPort, MatchPairsPort] })
export class RoomModule {}
