import { Injectable } from '@nestjs/common';

export type ClientType = 'confidential' | 'public' | 'service';

export interface CreateClientInput {
  tenantId: string;
  clientId: string;
  name: string;
  type: ClientType;
  secret?: string;
}

export interface UpdateClientInput {
  name?: string;
  enabled?: boolean;
}

export interface ClientDto {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  type: ClientType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegenerateSecretResult {
  clientId: string;
  secret: string;
}

export interface ListClientsQuery {
  tenantId?: string;
  enabled?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export abstract class ClientUsecase {
  abstract createClient(input: CreateClientInput): Promise<ClientDto & { secret?: string }>;
  abstract getClient(clientId: string): Promise<ClientDto | null>;
  abstract listClients(query: ListClientsQuery): Promise<PaginatedResult<ClientDto>>;
  abstract updateClient(clientId: string, input: UpdateClientInput): Promise<ClientDto>;
  abstract deleteClient(clientId: string): Promise<void>;
  abstract regenerateSecret(clientId: string): Promise<RegenerateSecretResult>;
}

