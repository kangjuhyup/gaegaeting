import { Injectable } from '@nestjs/common';

export interface SessionDto {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface ListSessionsQuery {
  userId?: string;
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
export abstract class SessionUsecase {
  abstract getUserSessions(userId: string): Promise<SessionDto[]>;
  abstract listSessions(query: ListSessionsQuery): Promise<PaginatedResult<SessionDto>>;
  abstract terminateSession(sessionId: string): Promise<void>;
  abstract terminateAllUserSessions(userId: string): Promise<{ terminated: number }>;
}

