export class Tenant {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: { id: string; code: string; name: string }): Tenant {
    if (!params.code || params.code.length === 0) {
      throw new Error('Tenant code is required');
    }
    if (!params.name || params.name.length === 0) {
      throw new Error('Tenant name is required');
    }
    return new Tenant(params.id, params.code, params.name, new Date(), new Date());
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Tenant name cannot be empty');
    }
    this.name = name;
  }

  setPersistence(id: string, createdAt: Date, updatedAt: Date): Tenant {
    return new Tenant(id, this.code, this.name, createdAt, updatedAt);
  }
}

