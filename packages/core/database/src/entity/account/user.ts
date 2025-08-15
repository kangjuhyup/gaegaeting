import { Column, Entity, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { PetOrmEntity } from "./pet";
import { AuthOrmEntity } from "./auth";
import { ulid } from "ulid";
import { UserAttachmentOrmEntity } from "./user-attachment";
import { BaseEntity } from "../base";

/**
 * 사용자 엔티티
 *
 * 이 엔티티는 사용자 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("user")
export class UserOrmEntity extends BaseEntity{
  /**
   * 사용자 ID
   * ulid를 사용하여 자동 생성됩니다.
   */
  @PrimaryColumn({ type: 'char', length: 26, name: 'id' })
  id: string = ulid();

  /**
   * 이메일
   */
  @Column({ type: 'varchar', length: 255, unique: true, name: 'email', nullable : true })
  email?: string;

  /**
   * 비밀번호 해시
   */
  @Column({ type: 'varchar', length: 255, nullable : true, name: 'password_hash' })
  passwordHash?: string;

  /**
   * 닉네임
   */
  @Column({ type: 'varchar', length: 50, nullable : false, name: 'nickname' })
  nickname: string;

  /**
   * 성별
   */
  @Column({ 
    type: 'tinyint', 
    nullable : false, 
    name: 'gender',
  })
  gender: number;

  /**
   * 생년월일
   */
  @Column({ type: 'date', nullable : false, name: 'birth_date' })
  birthDate: Date;

  /**
   * 생활 지역
   */
  @Column({ 
    type: 'tinyint',
    nullable : false, 
    name: 'region',
  })
  region: number;

  /**
   * 자기소개
   */
  @Column({ type: 'varchar',length:1000, nullable: true, name: 'bio' })
  bio?: string;

  /**
   * 전화번호
   */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' })
  phoneNumber?: string;

  /**
   * 회원 상태
   */
  @Column({ 
    type: 'tinyint', 
    default: 0, 
    name: 'status',
  })
  status: number;

  /**
   * 사용자가 소유한 강아지들
   */
  @OneToMany(() => PetOrmEntity, (pet) => pet.owner , {nullable : true})
  pets?: PetOrmEntity[];

  /**
   * 사용자의 인증 정보들
   * 
   * 한 사용자는 여러 인증 세션을 가질 수 있습니다.
   * 
   * 사용자가 생성 되면 인증에 userId 가 자동적으로 업데이트 됩니다.
   */
  @OneToOne(() => AuthOrmEntity, (auth) => auth.user , { cascade : ['insert','remove'], nullable : false})
  auth: AuthOrmEntity;

  /**
   * 사용자 프로필 첨부파일들
   */
  @OneToMany(() => UserAttachmentOrmEntity, (attachment) => attachment.user)
  attachments: UserAttachmentOrmEntity[];
}
