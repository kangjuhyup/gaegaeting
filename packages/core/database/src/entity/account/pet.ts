import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserOrmEntity } from "./user";
import { EnumTransformer } from "../../transformer/enum.transformer";
import { BaseEntity } from "../base";
import { PetAttachmentOrmEntity } from "./pet-attachment";

/**
 * 강아지 엔티티
 *
 * 이 엔티티는 강아지 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("pet")
export class PetOrmEntity extends BaseEntity {
  /**
   * 강아지 ID
   */
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /**
   * 강아지 이름
   */
  @Column({ type: 'varchar', length: 50, name: 'name' , nullable : false})
  name: string;

  /**
   * 강아지 나이 (년)
   */
  @Column({ type: 'int', nullable : true, name: 'age' })
  age?: number;

  /**
   * 강아지 성별
   */
  @Column({ 
    type: 'tinyint', 
    name: 'gender',
    nullable : false,
  })
  gender: number;

  /**
   * 강아지 품종
   */
  @Column({ 
    type: 'tinyint', 
    name: 'breed',
    nullable : false,
  })
  breed: number;

  /**
   * 강아지 크기
   */
  @Column({ type: 'tinyint', name: 'size' , nullable : false})
  size?: number;

  /**
   * 강아지 성격 특성 (JSON 배열로 저장)
   */
  @Column({ type: 'simple-array', name: 'personalities' })
  personalities: number[];

  /**
   * 강아지 설명
   */
  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  /**
   * 소유자 사용자 ID
   */
  @Column({ type: 'char', length: 26, name: 'user_id' })
  userId: string;

  /**
   * 강아지의 소유자 (사용자) 참조
   */
  @ManyToOne(() => UserOrmEntity, (user) => user.pets)
  @JoinColumn({ name: "user_id" })
  owner: UserOrmEntity;

  @OneToMany(() => PetAttachmentOrmEntity, (petAttachment) => petAttachment.pet)
  attachments: PetAttachmentOrmEntity[];
}
