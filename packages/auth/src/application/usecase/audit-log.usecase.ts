import { Injectable } from '@nestjs/common';

export type AuditEventType = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_STATUS_CHANGED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET';

export interface AuditLogDto {
  id: string;
  tenantId: string;
  userId?: string;
  eventType: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ListAuditLogsQuery {
  tenantId?: string;
  userId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
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
export abstract class AuditLogUsecase {
  abstract listAuditLogs(query: ListAuditLogsQuery): Promise<PaginatedResult<AuditLogDto>>;
  abstract getAuditLog(logId: string): Promise<AuditLogDto | null>;
}

