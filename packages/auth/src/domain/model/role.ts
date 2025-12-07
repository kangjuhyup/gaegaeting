import { PersistenceEntity } from '@core/model';

interface IRole {
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
}

export class Role extends PersistenceEntity<string, IRole> {
  private constructor(param: IRole, id?: string) {
    super(param, id);
  }

  static of(param: IRole, id?: string): Role {
    return new Role(param, id);
  }

  static create(params: {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    description?: string;
  }): Role {
    if (!params.code || params.code.length === 0) {
      throw new Error('Role code is required');
    }
    if (!params.name || params.name.length === 0) {
      throw new Error('Role name is required');
    }
    return new Role(
      {
        tenantId: params.tenantId,
        code: params.code,
        name: params.name,
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

  get name(): string {
    return this.etc.name;
  }

  get description(): string | null {
    return this.etc.description;
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Role name cannot be empty');
    }
    this.etc.name = name;
  }

  updateDescription(description: string | null): void {
    this.etc.description = description;
  }
}

