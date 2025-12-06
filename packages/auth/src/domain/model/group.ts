export class Group {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly code: string,
    public name: string,
    public parentId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    tenantId: string;
    code: string;
    name: string;
    parentId?: string;
  }): Group {
    if (!params.code || params.code.length === 0) {
      throw new Error('Group code is required');
    }
    if (!params.name || params.name.length === 0) {
      throw new Error('Group name is required');
    }
    return new Group(
      params.id,
      params.tenantId,
      params.code,
      params.name,
      params.parentId ?? null,
      new Date(),
      new Date(),
    );
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Group name cannot be empty');
    }
    this.name = name;
  }

  updateParent(parentId: string | null): void {
    if (parentId === this.id) {
      throw new Error('Group cannot be its own parent');
    }
    this.parentId = parentId;
  }

  hasParent(): boolean {
    return this.parentId !== null;
  }
}

