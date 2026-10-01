import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, ExternalUserSubjectOrmEntity, RegistrationEligibilityOrmEntity } from '@core/database/mikro';
import {
  RegistrationEligibilityRepositoryPort,
  type ClaimRegistrationEligibility,
  type ClaimedRegistrationEligibility,
  type CompleteRegistrationEligibility,
  type IssuedRegistrationEligibility,
} from '../../../../application/port/registration-eligibility-repository.port.js';

@Injectable()
export class RegistrationEligibilityOrmRepository implements RegistrationEligibilityRepositoryPort {
  constructor(private readonly entityManager: EntityManager) {}

  async issue(record: IssuedRegistrationEligibility): Promise<IssuedRegistrationEligibility> {
    const row = this.entityManager.create(RegistrationEligibilityOrmEntity, record);
    this.entityManager.persist(row);
    await this.entityManager.flush();
    return record;
  }

  async claim(input: ClaimRegistrationEligibility): Promise<ClaimedRegistrationEligibility> {
    return this.entityManager.transactional(async em => {
      const row = await em.findOne(RegistrationEligibilityOrmEntity, { handoffDigest: input.handoffDigest });
      if (!row) throw new NotFoundException('Registration handoff was not found');
      if (row.tenantId !== input.tenantId || row.clientId !== input.clientId) {
        throw new ConflictException('Registration handoff binding does not match');
      }
      if (row.status === 'USED' && row.attemptId === input.attemptId && row.claimedUntil) {
        return { registrationId: row.id, attemptId: row.attemptId, claimedUntil: row.claimedUntil };
      }
      if (row.status === 'CLAIMED' && row.attemptId === input.attemptId && row.claimedUntil) {
        if (row.claimedUntil.getTime() <= input.now.getTime()) {
          throw new GoneException('Registration claim lease expired');
        }
        return { registrationId: row.id, attemptId: row.attemptId, claimedUntil: row.claimedUntil };
      }
      if (row.status !== 'ISSUED') throw new ConflictException('Registration handoff is already claimed');
      if (row.expiresAt.getTime() <= input.now.getTime()) throw new GoneException('Registration handoff expired');

      const changed = await em.nativeUpdate(
        RegistrationEligibilityOrmEntity,
        { id: row.id, status: 'ISSUED', attemptId: null },
        { status: 'CLAIMED', attemptId: input.attemptId, claimedUntil: input.claimedUntil },
      );
      if (changed !== 1) {
        const winner = await em.findOne(RegistrationEligibilityOrmEntity, { id: row.id }, { refresh: true });
        if (winner?.status === 'CLAIMED' && winner.attemptId === input.attemptId && winner.claimedUntil) {
          return { registrationId: winner.id, attemptId: winner.attemptId, claimedUntil: winner.claimedUntil };
        }
        throw new ConflictException('Registration handoff was claimed concurrently');
      }
      return { registrationId: row.id, attemptId: input.attemptId, claimedUntil: input.claimedUntil };
    });
  }

  async complete(input: CompleteRegistrationEligibility): Promise<{ registrationId: string; status: 'USED' }> {
    return this.entityManager.transactional(async em => {
      const row = await em.findOne(RegistrationEligibilityOrmEntity, { id: input.registrationId });
      if (!row) throw new NotFoundException('Registration eligibility was not found');
      if (row.status === 'USED') {
        if (row.attemptId === input.attemptId && row.authIssuer === input.issuer && row.authSubject === input.subject) {
          return { registrationId: row.id, status: 'USED' };
        }
        throw new ConflictException('Registration eligibility was completed with another binding');
      }
      if (row.status !== 'CLAIMED' || row.attemptId !== input.attemptId) {
        throw new ConflictException('Registration eligibility is not claimed by this attempt');
      }
      if (!row.claimedUntil || row.claimedUntil.getTime() <= input.now.getTime()) {
        throw new GoneException('Registration claim lease expired');
      }

      const changed = await em.nativeUpdate(
        RegistrationEligibilityOrmEntity,
        { id: row.id, status: 'CLAIMED', attemptId: input.attemptId },
        { status: 'USED', authIssuer: input.issuer, authSubject: input.subject },
      );
      if (changed !== 1) {
        const winner = await em.findOne(RegistrationEligibilityOrmEntity, { id: row.id }, { refresh: true });
        if (winner?.status === 'USED' && winner.attemptId === input.attemptId && winner.authIssuer === input.issuer && winner.authSubject === input.subject) {
          return { registrationId: winner.id, status: 'USED' };
        }
        throw new ConflictException('Registration eligibility was completed concurrently');
      }

      const existingSubject = await em.findOne(ExternalUserSubjectOrmEntity, {
        tenantId: input.issuer,
        subject: input.subject,
      });
      if (existingSubject && existingSubject.userId !== row.userId) {
        throw new ConflictException('OIDC subject is already linked');
      }
      if (!existingSubject) {
        em.persist(em.create(ExternalUserSubjectOrmEntity, {
          userId: row.userId,
          tenantId: input.issuer,
          subject: input.subject,
        }));
      }
      await em.flush();
      return { registrationId: row.id, status: 'USED' };
    });
  }
}
