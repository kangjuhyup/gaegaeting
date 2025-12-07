import { PersistenceEntity } from '@core/model';

export type ClientType = 'confidential' | 'public' | 'service';

interface IClient {
  tenantId: string;
  clientId: string;
  name: string;
  type: ClientType;
  enabled: boolean;
}

export class Client extends PersistenceEntity<string, IClient> {
  private constructor(param: IClient, id?: string) {
    super(param, id);
  }

  static of(param: IClient, id?: string): Client {
    return new Client(param, id);
  }

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
      {
        tenantId: params.tenantId,
        clientId: params.clientId,
        name: params.name,
        type: params.type,
        enabled: true,
      },
      params.id,
    );
  }

  get tenantId(): string {
    return this.etc.tenantId;
  }

  get clientId(): string {
    return this.etc.clientId;
  }

  get name(): string {
    return this.etc.name;
  }

  get type(): ClientType {
    return this.etc.type;
  }

  get enabled(): boolean {
    return this.etc.enabled;
  }

  updateName(name: string): void {
    if (!name || name.length === 0) {
      throw new Error('Client name cannot be empty');
    }
    this.etc.name = name;
  }

  enable(): void {
    this.etc.enabled = true;
  }

  disable(): void {
    this.etc.enabled = false;
  }

  isEnabled(): boolean {
    return this.etc.enabled;
  }

  isConfidential(): boolean {
    return this.etc.type === 'confidential';
  }

  isPublic(): boolean {
    return this.etc.type === 'public';
  }

  isService(): boolean {
    return this.etc.type === 'service';
  }

  requiresSecret(): boolean {
    return this.etc.type === 'confidential' || this.etc.type === 'service';
  }
}

