import { Entity, OneToMany } from "typeorm";
import {
  UserIdColumn,
  UserBasicInfoColumn,
  UserPersonalInfoColumn,
  UserAuthInfoColumn,
  UserMetadataColumn,
  UserGender,
  UserStatus,
  AuthProvider,
  UserRegion,
} from "../column/user";
import { PetOrmEntity } from "./pet";

/**
 * 사용자 엔티티
 *
 * 이 엔티티는 사용자 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("user")
export class UserOrmEntity
  extends UserIdColumn
  implements
    UserBasicInfoColumn,
    UserPersonalInfoColumn,
    UserAuthInfoColumn,
    UserMetadataColumn
{
  // UserBasicInfoColumn 구현
  email: string;
  passwordHash: string | null;
  nickname: string;
  profileImageUrl: string | null;

  // UserPersonalInfoColumn 구현
  gender: UserGender;
  birthDate: Date;
  region: UserRegion;
  bio: string | null;
  phoneNumber: string | null;

  // UserAuthInfoColumn 구현
  authProvider: AuthProvider;
  authProviderId: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;

  // UserMetadataColumn 구현
  createdAt: Date;
  updatedAt: Date;

  /**
   * 사용자가 소유한 강아지들
   */
  @OneToMany(() => PetOrmEntity, (pet) => pet.owner)
  pets: PetOrmEntity[];
}
