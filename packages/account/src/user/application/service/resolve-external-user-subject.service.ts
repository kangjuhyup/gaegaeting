import { Injectable, NotFoundException } from '@nestjs/common';
import { ExternalUserSubjectRepositoryPort } from '../../infrastructure/port/external-user-subject-repository.port.js';

@Injectable()
export class ResolveExternalUserSubjectService {
  constructor(private readonly repository: ExternalUserSubjectRepositoryPort) {}

  async resolve(tenantId: string, subject: string): Promise<string> {
    if (!tenantId?.trim() || !subject?.trim()) throw new Error('Invalid external subject');
    const existing = await this.repository.findUserId(tenantId, subject);
    if (existing) return existing;
    throw new NotFoundException('Auth subject is not linked to a Gaegaeting account');
  }
}
