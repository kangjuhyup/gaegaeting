export class Role {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly code: string,
    public name: string,
    public description: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

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
      params.id,
      params.tenantId,
      params.code,
      params.name,
      params.description ?? null,
      new Date(),
      new Date(),
    );
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Role name cannot be empty');
    }
    this.name = name;
  }

  updateDescription(description: string | null): void {
    this.description = description;
  }
}

