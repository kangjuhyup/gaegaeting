import { PersistenceEntity } from '@core/model';

interface IGroup {
  tenantId: string;
  code: string;
  name: string;
  parentId: string | null;
}

export class Group extends PersistenceEntity<string, IGroup> {
  private constructor(param: IGroup, id?: string) {
    super(param, id);
  }

  static of(param: IGroup, id?: string): Group {
    return new Group(param, id);
  }

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
      {
        tenantId: params.tenantId,
        code: params.code,
        name: params.name,
        parentId: params.parentId ?? null,
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

  get parentId(): string | null {
    return this.etc.parentId;
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Group name cannot be empty');
    }
    this.etc.name = name;
  }

  updateParent(parentId: string | null): void {
    if (parentId === this.id) {
      throw new Error('Group cannot be its own parent');
    }
    this.etc.parentId = parentId;
  }

  hasParent(): boolean {
    return this.etc.parentId !== null;
  }
}

