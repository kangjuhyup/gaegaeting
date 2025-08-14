import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { PetOrmEntity } from "./pet";
import { AuthOrmEntity } from "./auth";
import { ulid } from "ulid";
import { EnumTransformer } from "../transformer/enum.transformer";
import { UserGender, UserRegion, UserStatus } from "@app/enum";

/**
 * 사용자 엔티티
 *
 * 이 엔티티는 사용자 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("user")
export class UserOrmEntity {
  /**
   * 사용자 ID
   * ulid를 사용하여 자동 생성됩니다.
   */
  @PrimaryColumn({ type: 'varchar', length: 26, name: 'id' })
  id: string = ulid();

  /**
   * 이메일
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'email' })
  email: string;

  /**
   * 비밀번호 해시
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash' })
  passwordHash: string | null;

  /**
   * 닉네임
   */
  @Column({ type: 'varchar', length: 50, name: 'nickname' })
  nickname: string;

  /**
   * 프로필 이미지 URL
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'profile_image_url' })
  profileImageUrl: string | null;

  /**
   * 성별
   */
  @Column({ 
    type: 'tinyint', 
    default: UserGender.OTHER, 
    name: 'gender',
    transformer: new EnumTransformer(UserGender)
  })
  gender: UserGender;

  /**
   * 생년월일
   */
  @Column({ type: 'date', name: 'birth_date' })
  birthDate: Date;

  /**
   * 생활 지역
   */
  @Column({ 
    type: 'tinyint', 
    default: UserRegion.SEOUL, 
    name: 'region',
    transformer: new EnumTransformer(UserRegion)
  })
  region: UserRegion;

  /**
   * 자기소개
   */
  @Column({ type: 'text', nullable: true, name: 'bio' })
  bio: string | null;

  /**
   * 전화번호
   */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber: string | null;

  /**
   * 회원 상태
   */
  @Column({ 
    type: 'tinyint', 
    default: UserStatus.ACTIVE, 
    name: 'status',
    transformer: new EnumTransformer(UserStatus)
  })
  status: UserStatus;

  /**
   * 생성일시
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 사용자가 소유한 강아지들
   */
  @OneToMany(() => PetOrmEntity, (pet) => pet.owner)
  pets: PetOrmEntity[];

  /**
   * 사용자의 인증 정보들
   * 
   * 한 사용자는 여러 인증 세션을 가질 수 있습니다.
   */
  @OneToMany(() => AuthOrmEntity, (auth) => auth.user)
  auths: AuthOrmEntity[];

}
