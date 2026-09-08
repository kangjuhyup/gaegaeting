import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { ExternalUserSubjectRepositoryPort } from '../../infrastructure/port/external-user-subject-repository.port.js';

@Injectable()
export class ResolveExternalUserSubjectService {
  constructor(private readonly repository: ExternalUserSubjectRepositoryPort) {}

  async resolve(tenantId: string, subject: string): Promise<string> {
    if (!tenantId?.trim() || !subject?.trim()) throw new Error('Invalid external subject');
    const existing = await this.repository.findUserId(tenantId, subject);
    if (existing) return existing;
    const userId = ulid();
    try {
      await this.repository.insert({ userId, tenantId, subject });
      return userId;
    } catch (error) {
      if ((error as { code?: string })?.code !== '23505') throw error;
      const winner = await this.repository.findUserId(tenantId, subject);
      if (!winner) throw error;
      return winner;
    }
  }
}
