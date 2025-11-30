export class Permission {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly code: string,
    public readonly resource: string | null,
    public readonly action: string | null,
    public description: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

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
      params.id,
      params.tenantId,
      params.code,
      params.resource ?? null,
      params.action ?? null,
      params.description ?? null,
      new Date(),
      new Date(),
    );
  }

  updateDescription(description: string | null): void {
    this.description = description;
  }

  matches(resource: string, action: string): boolean {
    if (this.resource === '*' && this.action === '*') return true;
    if (this.resource === resource && this.action === '*') return true;
    if (this.resource === resource && this.action === action) return true;
    return false;
  }
}

