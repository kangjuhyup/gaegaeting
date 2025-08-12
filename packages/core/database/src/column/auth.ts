import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ulid } from "ulid";
import { AuthProvider, UserStatus } from "./user";

/**
 * 인증 ID 컬럼
 * 
 * 인증 정보의 고유 식별자를 정의합니다.
 */
export class AuthIdColumn {
  /**
   * 인증 ID
   * 
   * ULID를 사용하여 시간 순서로 정렬 가능한 ID를 생성합니다.
   */
  @PrimaryGeneratedColumn("uuid", { name: "id" })
  id: string = ulid();
}

/**
 * 인증 토큰 컬럼
 * 
 * 인증 토큰 관련 정보를 정의합니다.
 * accessToken은 Redis에 저장하므로 DB에는 저장하지 않습니다.
 */
export class AuthTokenColumn {
  /**
   * 리프레시 토큰
   * 
   * 액세스 토큰 갱신을 위한 리프레시 토큰
   */
  @Column({ name: "refresh_token", nullable: true })
  refreshToken: string | null;

  /**
   * 리프레시 토큰 만료 시간
   */
  @Column({ name: "refresh_token_expires_at", nullable: true })
  refreshTokenExpiresAt: Date | null;
}

/**
 * 인증 정보 컬럼
 * 
 * 사용자의 인증 방식 관련 정보를 정의합니다.
 * 회원 상태(status)는 User 엔티티에서 관리합니다.
 */
export class AuthInfoColumn {
  /**
   * 인증 방식
   */
  @Column({ type: "varchar", enum: AuthProvider, default: AuthProvider.EMAIL, name: "auth_provider" })
  authProvider: string;

  /**
   * 소셜 로그인 제공자 ID
   */
  @Column({ type: "varchar", length: 255, nullable: true, name: "auth_provider_id" })
  authProviderId: string | null;

  /**
   * 마지막 로그인 시간
   */
  @Column({ type: "timestamp", nullable: true, name: "last_login_at" })
  lastLoginAt: Date | null;
}

/**
 * 인증 세션 컬럼
 * 
 * 사용자 세션 관련 정보를 정의합니다.
 */
export class AuthSessionColumn {
  /**
   * 마지막 로그인 IP
   */
  @Column({ name: "last_login_ip", nullable: true })
  lastLoginIp: string | null;

  /**
   * 마지막 로그인 디바이스
   */
  @Column({ name: "last_login_device", nullable: true })
  lastLoginDevice: string | null;

  /**
   * 마지막 로그인 위치
   */
  @Column({ name: "last_login_location", nullable: true })
  lastLoginLocation: string | null;
}

/**
 * 인증 메타데이터 컬럼
 * 
 * 인증 정보의 메타데이터를 정의합니다.
 */
export class AuthMetadataColumn {
  /**
   * 생성 시간
   */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /**
   * 수정 시간
   */
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
