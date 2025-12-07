import { PersistenceEntity } from '@core/model';

interface IPermission {
  tenantId: string;
  code: string;
  resource: string | null;
  action: string | null;
  description: string | null;
}

export class Permission extends PersistenceEntity<string, IPermission> {
  private constructor(param: IPermission, id?: string) {
    super(param, id);
  }

  static of(param: IPermission, id?: string): Permission {
    return new Permission(param, id);
  }

  static create(params: {
    id: string;
    tenantId: string;
    code: string;
    resource?: string;
    action?: string;
    description?: string;
  }): Permission {
    if (!params.code || params.code.length === 0) {
      throw new Error('Permission code is required');
    }
    return new Permission(
      {
        tenantId: params.tenantId,
        code: params.code,
        resource: params.resource ?? null,
        action: params.action ?? null,
        description: params.description ?? null,
      },
      params.id,
    );
  }

  get tenantId(): string {
    return this.etc.tenantId;
  }

  get code(): string {
    return this.etc.code;
  }

  get resource(): string | null {
    return this.etc.resource;
  }

  get action(): string | null {
    return this.etc.action;
  }

  get description(): string | null {
    return this.etc.description;
  }

  updateDescription(description: string | null): void {
    this.etc.description = description;
  }

  matches(resource: string, action: string): boolean {
    if (this.etc.resource === '*' && this.etc.action === '*') return true;
    if (this.etc.resource === resource && this.etc.action === '*') return true;
    if (this.etc.resource === resource && this.etc.action === action) return true;
    return false;
  }
}

