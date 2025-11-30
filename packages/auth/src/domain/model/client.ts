export type ClientType = 'confidential' | 'public' | 'service';

export class Client {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly clientId: string,
    public name: string,
    public readonly type: ClientType,
    public enabled: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    tenantId: string;
    clientId: string;
    name: string;
    type: ClientType;
  }): Client {
    if (!params.clientId || params.clientId.length === 0) {
      throw new Error('Client ID is required');
    }
    if (!params.name || params.name.length === 0) {
      throw new Error('Client name is required');
    }
    return new Client(
      params.id,
      params.tenantId,
      params.clientId,
      params.name,
      params.type,
      true,
      new Date(),
      new Date(),
    );
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Client name cannot be empty');
    }
    this.name = name;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isConfidential(): boolean {
    return this.type === 'confidential';
  }

  isPublic(): boolean {
    return this.type === 'public';
  }

  isService(): boolean {
    return this.type === 'service';
  }

  requiresSecret(): boolean {
    return this.type === 'confidential' || this.type === 'service';
  }
}

