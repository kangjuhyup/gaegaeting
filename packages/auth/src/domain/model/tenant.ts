import { PersistenceEntity } from '@core/model';

interface ITenant {
  code: string;
  name: string;
}

export class Tenant extends PersistenceEntity<string, ITenant> {
  private constructor(param: ITenant, id?: string) {
    super(param, id);
  }

  static of(param: ITenant, id?: string): Tenant {
    return new Tenant(param, id);
  }

  static create(params: { id: string; code: string; name: string }): Tenant {
    if (!params.code || params.code.length === 0) {
      throw new Error('Tenant code is required');
    }
    if (!params.name || params.name.length === 0) {
      throw new Error('Tenant name is required');
    }
    return new Tenant(
      {
        code: params.code,
        name: params.name,
      },
      params.id,
    );
  }

  get code(): string {
    return this.etc.code;
  }

  get name(): string {
    return this.etc.name;
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Tenant name cannot be empty');
    }
    this.etc.name = name;
  }
}

