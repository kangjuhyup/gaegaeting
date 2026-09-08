export interface ExternalUserSubjectMapping {
  userId: string;
  tenantId: string;
  subject: string;
}

export abstract class ExternalUserSubjectRepositoryPort {
  abstract findUserId(tenantId: string, subject: string): Promise<string | null>;
  abstract insert(mapping: ExternalUserSubjectMapping): Promise<void>;
}
