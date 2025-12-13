import { Column, Entity, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { PetProfileOrmEntity } from "./pet-profile";
import { ulid } from "ulid";
import { UserAttachmentOrmEntity } from "./user-attachment";
import { BaseEntity } from "../base";
import { UserProfileStatus } from "./enum/user-profile-status";
import { ValueEnumTransformer } from "../../transformer/value-enum.transformer";

/**
 * 사용자 엔티티
 *
 * 이 엔티티는 사용자 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("user_profile")
export class UserProfileOrmEntity extends BaseEntity{
  /**
   * 사용자 ID
   * Auth 의 UserEntity ID 와 동일합니다.
   */
  @PrimaryColumn({ type: 'char', length: 26, name: 'id' })
  id: string = ulid();

  /**
   * 사용자 이름
   */
  @Column({ type : 'varchar', length: 50, nullable : false, name: 'name' })
  name : string;

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
   * 회원 상태
   * 
   * 사용자 프로필의 활성화 상태를 나타냅니다.
   * 기본값은 ACTIVE(0)입니다.
   * 
   * @see UserProfileStatus
   * - ACTIVE(0): 활성화 상태
   * - INACTIVE(1): 비활성화 상태
   * - SUSPENDED(2): 정지 상태
   * - DELETED(3): 삭제 상태
   */
  @Column({ 
    type: 'tinyint', 
    default: UserProfileStatus.ACTIVE.value, 
    name: 'status',
    transformer: new ValueEnumTransformer(UserProfileStatus),
  })
  status: UserProfileStatus;

  /**
   * 사용자가 소유한 강아지들
   */
  @OneToMany(() => PetProfileOrmEntity, (pet) => pet.owner , {nullable : true})
  pets?: PetProfileOrmEntity[];

  /**
   * 사용자 프로필 첨부파일들
   */
  @OneToMany(() => UserAttachmentOrmEntity, (attachment) => attachment.user)
  attachments: UserAttachmentOrmEntity[];
}
