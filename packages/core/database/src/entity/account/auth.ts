import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { UserOrmEntity } from "./user";
import { BaseEntity } from "../base";

/**
 * 인증 엔티티
 *
 * 이 엔티티는 사용자의 로그인 및 인증 관련 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity('auth')
export class AuthOrmEntity extends BaseEntity {
  /**
   * 인증 방식 (PK 일부)
   */
  @PrimaryColumn({ 
    type: "tinyint", 
    default: 0, 
    name: "auth_provider",
  })
  authProvider: number;

  /**
   * 소셜 로그인 제공자 ID (PK 일부)
   */
  @PrimaryColumn({ type: "varchar", length: 255, name: "auth_provider_id" })
  authProviderId: string;

  /**
   * 리프레시 토큰
   */
  @Column({ name: "refresh_token", nullable: true })
  refreshToken: string | null;

  /**
   * 리프레시 토큰 만료 시간
   */
  @Column({ name: "refresh_token_expires_at", nullable: true })
  refreshTokenExpiresAt: Date | null;

  
  /**
   * 마지막 로그인 시간
   */
  @Column({ type: "timestamp", nullable: true, name: "last_login_at" })
  lastLoginAt: Date | null;

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


  @Column({ name : 'user_id', type : 'char' , length: 26, nullable: true})
  userId? : string;
  /**
   * 인증 정보와 연결된 사용자
   * 
   * 한 사용자는 여러 인증 정보(세션)를 가질 수 있습니다.
   */
  @OneToOne(() => UserOrmEntity, (user) => user.auth, {nullable : true})
  @JoinColumn({ name: "user_id" })
  user?: UserOrmEntity;

}