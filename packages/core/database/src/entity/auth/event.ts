// src/entities/event.entity.ts
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantOrmEntity } from './tenant';
import { UserOrmEntity } from './user';
import { ClientOrmEntity } from './client';

// 범주(카테고리) - 필요에 맞게 추가/수정
export type EventCategory =
  | 'AUTH'        // 로그인/로그아웃/토큰/2FA/소셜연동
  | 'USER'        // 사용자 생성/수정/삭제/비밀번호 변경 등
  | 'ROLE'        // 롤 생성/수정/삭제, 부여/회수
  | 'GROUP'       // 그룹 생성/수정/삭제, 멤버십 변경
  | 'PERMISSION'  // 퍼미션 변경
  | 'SECURITY'    // 접근거부, 비정상 시도, 잠금
  | 'SYSTEM'      // 시스템 상태/알림
  | 'OTHER';

export type EventSeverity = 'INFO' | 'WARN' | 'ERROR';

// 액션(행위) - 세분화 가능
export type EventAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'TOKEN_ISSUED'
  | 'TOKEN_REVOKED'
  | 'ACCESS_DENIED'
  | 'LINK_IDP'
  | 'UNLINK_IDP'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'REVOKE'
  | 'CONFIG_CHANGE'
  | 'OTHER';

@Entity({ name: 'event' })
@Index('idx_event_tenant_time', ['tenant', 'occurredAt'])
@Index('idx_event_category_time', ['category', 'occurredAt'])
@Index('idx_event_user_time', ['user', 'occurredAt'])
@Index('idx_event_client_time', ['client', 'occurredAt'])
@Index('idx_event_action_time', ['action', 'occurredAt'])
export class EventOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  // 멀티테넌시 구분 (필수)
  @ManyToOne(() => TenantOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  tenant!: TenantOrmEntity;

  // 누가(선택): 시스템 이벤트면 null 허용
  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  user?: UserOrmEntity | null;

  // 어떤 클라이언트/앱에서(선택)
  @ManyToOne(() => ClientOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  client?: ClientOrmEntity | null;

  @Column({ type: 'varchar', length : 20 })
  category!: EventCategory;

  @Column({ type: 'varchar', length : 20 })
  severity!: EventSeverity;

  @Column({ type: 'varchar', length : 20 })
  action!: EventAction;

  // 어떤 리소스/대상에 대한 이벤트인지(선택)
  @Column({ name: 'resource_type', type: 'varchar', length: 64, nullable: true })
  resourceType?: string | null; // 예: 'ROLE', 'GROUP', 'USER', 'PERMISSION', 'SESSION'…

  @Column({ name: 'resource_id', type: 'varchar', length: 191, nullable: true })
  resourceId?: string | null;

  // 결과(성공/실패 여부 및 코드/사유 등)
  @Column({ name: 'success', type: 'tinyint', width: 1, default: 1 })
  success!: boolean;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason?: string | null;

  // 네트워크/클라이언트 컨텍스트
  @Column({ type: 'varbinary', length: 16, nullable: true })
  ip?: Buffer | null; // IPv4/IPv6 바이너리

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  // 추가 메타데이터(JSON)
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  // 발생 시각(기본 now)
  @Column({ name: 'occurred_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  occurredAt!: Date;
}