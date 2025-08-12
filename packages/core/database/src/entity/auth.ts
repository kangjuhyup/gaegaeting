import { Entity, JoinColumn, ManyToOne } from "typeorm";
import { AuthProvider, UserStatus } from "../column/user";
import { 
  AuthIdColumn, 
  AuthTokenColumn, 
  AuthSessionColumn, 
  AuthMetadataColumn,
  AuthInfoColumn 
} from "../column/auth";
import { UserOrmEntity } from "./user";

/**
 * 인증 엔티티
 *
 * 이 엔티티는 사용자의 로그인 및 인증 관련 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity('auth')
export class AuthOrmEntity 
  extends AuthIdColumn
  implements 
    AuthTokenColumn,
    AuthInfoColumn,
    AuthSessionColumn,
    AuthMetadataColumn 
{
  // AuthTokenColumn 구현
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;

  // AuthInfoColumn 구현
  authProvider: string;
  authProviderId: string | null;
  lastLoginAt: Date | null;

  // AuthSessionColumn 구현
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  lastLoginLocation: string | null;

  // AuthMetadataColumn 구현
  createdAt: Date;
  updatedAt: Date;

  /**
   * 인증 정보와 연결된 사용자
   * 
   * 한 사용자는 여러 인증 정보(세션)를 가질 수 있습니다.
   */
  @ManyToOne(() => UserOrmEntity, (user) => user.auths)
  @JoinColumn({ name: "user_id" })
  user: UserOrmEntity;

}