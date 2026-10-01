import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, AccountSignupOrmEntity, ExternalUserSubjectOrmEntity } from '@core/database/mikro';
import { ulid } from 'ulid';
import { AccountSignupRepositoryPort, type AccountSignupRecord } from '../../../../application/port/account-signup-repository.port.js';

@Injectable()
export class AccountSignupOrmRepository extends AccountSignupRepositoryPort {
  constructor(private readonly em: EntityManager) { super(); }

  async reserve(input: { diDigest: string; username: string; issuer: string; termsVersion: string }): Promise<AccountSignupRecord> {
    let row = await this.em.findOne(AccountSignupOrmEntity, { diDigest: input.diDigest });
    if (!row) {
      try {
        row = await this.em.transactional(async em => {
          const created = em.create(AccountSignupOrmEntity, {
            id: ulid(), userId: ulid(), diDigest: input.diDigest,
            username: input.username, termsVersion: input.termsVersion, termsAgreedAt: new Date(),
            authIssuer: input.issuer, status: 'PENDING',
          });
          em.persist(created);
          await em.flush();
          return created;
        });
      } catch (error) {
        if ((error as { code?: string })?.code !== '23505') throw error;
        row = await this.em.findOne(AccountSignupOrmEntity, { diDigest: input.diDigest }, { refresh: true });
      }
    }
    if (!row || row.username !== input.username || row.authIssuer !== input.issuer || row.termsVersion !== input.termsVersion) {
      throw new ConflictException('Identity is already registered with another account');
    }
    return { userId: row.userId, username: row.username, issuer: row.authIssuer, authSubject: row.authSubject };
  }

  async complete(input: { diDigest: string; subject: string }): Promise<AccountSignupRecord> {
    return this.em.transactional(async em => {
      const row = await em.findOneOrFail(AccountSignupOrmEntity, { diDigest: input.diDigest });
      if (row.authSubject && row.authSubject !== input.subject) {
        throw new ConflictException('Identity is already linked to another Auth subject');
      }
      const existing = await em.findOne(ExternalUserSubjectOrmEntity, {
        tenantId: row.authIssuer, subject: input.subject,
      });
      if (existing && existing.userId !== row.userId) {
        throw new ConflictException('Auth subject is already linked to another account');
      }
      if (!existing) {
        em.persist(em.create(ExternalUserSubjectOrmEntity, {
          userId: row.userId, tenantId: row.authIssuer, subject: input.subject,
        }));
      }
      row.authSubject = input.subject;
      row.status = 'COMPLETED';
      await em.flush();
      return { userId: row.userId, username: row.username, issuer: row.authIssuer, authSubject: input.subject };
    });
  }
}
