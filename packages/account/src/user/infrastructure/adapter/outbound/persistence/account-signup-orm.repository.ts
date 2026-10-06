import { ConflictException, Injectable } from "@nestjs/common";
import {
  EntityManager,
  LockMode,
  AccountSignupOrmEntity,
  ExternalUserSubjectOrmEntity,
} from "@core/database/mikro";
import { ulid } from "ulid";
import {
  AccountSignupRepositoryPort,
  type AccountSignupRecord,
  type AccountSignupReservation,
  type SignupIdentity,
} from "../../../../application/port/account-signup-repository.port.js";

@Injectable()
export class AccountSignupOrmRepository extends AccountSignupRepositoryPort {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async reserve(input: AccountSignupReservation): Promise<AccountSignupRecord> {
    const method = input.method ?? "PASSWORD";
    if (
      (method === "SOCIAL" &&
        (!/^[a-f0-9]{64}$/.test(input.externalIdentityDigest ?? "") ||
          input.username !== undefined)) ||
      (method === "PASSWORD" &&
        (!input.username || input.externalIdentityDigest !== undefined))
    ) {
      throw new ConflictException("Invalid signup method binding");
    }
    let row = await this.em.findOne(AccountSignupOrmEntity, {
      diDigest: input.diDigest,
    });
    if (!row) {
      try {
        row = await this.em.transactional(async (em) => {
          const created = em.create(AccountSignupOrmEntity, {
            id: ulid(),
            userId: ulid(),
            diDigest: input.diDigest,
            username: input.username,
            signupMethod: method,
            externalIdentityDigest: input.externalIdentityDigest,
            termsVersion: input.termsVersion,
            termsAgreedAt: new Date(),
            authIssuer: input.issuer,
            status: "PENDING",
            verificationProvider: input.verification.provider,
            providerTransactionId: input.verification.providerTransactionId,
            verifiedAt: input.verification.verifiedAt,
            ...input.identity,
          });
          em.persist(created);
          await em.flush();
          return created;
        });
      } catch (error) {
        if ((error as { code?: string })?.code !== "23505") throw error;
        row = await this.em.findOne(
          AccountSignupOrmEntity,
          { diDigest: input.diDigest },
          { refresh: true },
        );
      }
    }
    if (
      !row ||
      (row.signupMethod ?? "PASSWORD") !== method ||
      (method === "PASSWORD"
        ? row.username !== input.username
        : row.externalIdentityDigest !== input.externalIdentityDigest) ||
      row.authIssuer !== input.issuer ||
      row.termsVersion !== input.termsVersion
    ) {
      throw new ConflictException(
        method === "SOCIAL"
          ? "IDENTITY_ALREADY_REGISTERED"
          : "Identity is already registered with another account",
      );
    }
    if (
      input.identity &&
      (row.name !== input.identity.name ||
        row.gender !== input.identity.gender ||
        row.phone !== input.identity.phone ||
        row.birthDate?.getTime() !== input.identity.birthDate.getTime())
    ) {
      throw new ConflictException("Signup identity cannot be changed on retry");
    }
    if (
      row.verificationProvider &&
      row.verificationProvider !== input.verification.provider
    ) {
      throw new ConflictException(
        "Signup verification provider cannot be changed on retry",
      );
    }
    return {
      userId: row.userId,
      username: row.username,
      issuer: row.authIssuer,
      authSubject: row.authSubject,
    };
  }

  async findIdentity(userId: string): Promise<SignupIdentity | null> {
    const row = await this.em.findOne(AccountSignupOrmEntity, {
      userId,
      status: "COMPLETED",
    });
    if (!row?.name || !row.birthDate || !row.gender || !row.phone) return null;
    return {
      name: row.name,
      birthDate: row.birthDate,
      gender: row.gender,
      phone: row.phone,
    };
  }

  async complete(input: {
    diDigest: string;
    subject: string;
  }): Promise<AccountSignupRecord> {
    return this.em.transactional(async (em) => {
      const row = await em.findOneOrFail(
        AccountSignupOrmEntity,
        { diDigest: input.diDigest },
        { lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true },
      );
      if (row.authSubject && row.authSubject !== input.subject) {
        throw new ConflictException(
          "Identity is already linked to another Auth subject",
        );
      }
      const existing = await em.findOne(ExternalUserSubjectOrmEntity, {
        tenantId: row.authIssuer,
        subject: input.subject,
      });
      if (existing && existing.userId !== row.userId) {
        throw new ConflictException(
          "Auth subject is already linked to another account",
        );
      }
      if (!existing) {
        em.persist(
          em.create(ExternalUserSubjectOrmEntity, {
            userId: row.userId,
            tenantId: row.authIssuer,
            subject: input.subject,
          }),
        );
      }
      row.authSubject = input.subject;
      row.status = "COMPLETED";
      await em.flush();
      return {
        userId: row.userId,
        username: row.username,
        issuer: row.authIssuer,
        authSubject: input.subject,
      };
    });
  }
}
