import { EntityManager, ExternalUserSubjectOrmEntity } from '@core/database/mikro';
import { Injectable } from '@nestjs/common';
import {
  type ExternalUserSubjectMapping,
  ExternalUserSubjectRepositoryPort,
} from '../../../port/external-user-subject-repository.port.js';

@Injectable()
export class ExternalUserSubjectOrmRepository implements ExternalUserSubjectRepositoryPort {
  constructor(private readonly entityManager: EntityManager) {}

  private get repository() {
    return this.entityManager.getRepository(ExternalUserSubjectOrmEntity);
  }

  async findUserId(tenantId: string, subject: string): Promise<string | null> {
    const row = await this.repository.findOne({ tenantId, subject });
    return row?.userId ?? null;
  }

  async insert(mapping: ExternalUserSubjectMapping): Promise<void> {
    this.entityManager.persist(this.repository.create(mapping));
    await this.entityManager.flush();
  }
}
