import { Module } from '@nestjs/common';
import { ParticipantService } from './application/service/participant.service.js';
import { ParticipantRepositoryPort } from './application/port/participant-repository.port.js';
import { ParticipantPostgresRepository } from './infrastructure/persistence/participant.postgres.repository.js';
import { ParticipantResolver } from './infrastructure/graphql/participant.resolver.js';
@Module({ imports: [], providers: [ParticipantService, ParticipantResolver, { provide: ParticipantRepositoryPort, useClass: ParticipantPostgresRepository }], exports: [ParticipantRepositoryPort] })
export class ParticipantModule {}
