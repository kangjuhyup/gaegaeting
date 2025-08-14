import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import {
  PetGender,
  PetSize,
  PetBreed,
  PetPersonality,
} from "../enum/pet";
import { UserOrmEntity } from "./user";
import { EnumTransformer } from "../transformer/enum.transformer";

/**
 * 강아지 엔티티
 *
 * 이 엔티티는 강아지 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("pet")
export class PetOrmEntity {
  /**
   * 강아지 ID
   */
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /**
   * 강아지 이름
   */
  @Column({ type: 'varchar', length: 50, name: 'name' })
  name: string;

  /**
   * 강아지 나이 (년)
   */
  @Column({ type: 'int', name: 'age' })
  age: number;

  /**
   * 강아지 성별
   */
  @Column({ 
    type: 'tinyint', 
    name: 'gender',
    transformer: new EnumTransformer(PetGender)
  })
  gender: PetGender;

  /**
   * 강아지 품종
   */
  @Column({ 
    type: 'tinyint', 
    default: PetBreed.OTHER, 
    name: 'breed',
    transformer: new EnumTransformer(PetBreed)
  })
  breed: PetBreed;

  /**
   * 강아지 크기
   */
  @Column({ type: 'tinyint', name: 'size', transformer: new EnumTransformer(PetSize) })
  size: PetSize;

  /**
   * 강아지 성격 특성 (JSON 배열로 저장)
   */
  @Column({ type: 'simple-array', name: 'personalities' })
  personalities: PetPersonality[];

  /**
   * 강아지 이미지 URL 목록 (JSON 배열로 저장)
   */
  @Column({ type: 'simple-array', nullable: true, name: 'image_urls' })
  imageUrls: string[] | null;

  /**
   * 강아지 설명
   */
  @Column({ type: 'text', nullable: true, name: 'description' })
  description: string | null;

  /**
   * 소유자 사용자 ID
   */
  @Column({ type: 'varchar', length: 26, name: 'owner_id' })
  ownerId: string;

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
   * 강아지의 소유자 (사용자) 참조
   */
  @ManyToOne(() => UserOrmEntity, (user) => user.pets)
  @JoinColumn({ name: "owner_id" })
  owner: UserOrmEntity;
}
