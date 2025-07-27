import { Entity, ManyToOne, JoinColumn } from "typeorm";
import {
  PetIdColumn,
  PetBasicInfoColumn,
  PetAdditionalInfoColumn,
  PetOwnerInfoColumn,
  PetMetadataColumn,
  PetGender,
  PetSize,
  PetBreed,
  PetPersonality,
} from "../column/pet";
import { UserOrmEntity } from "./user";

/**
 * 강아지 엔티티
 *
 * 이 엔티티는 강아지 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 각 컴포넌트는 관련 속성들을 그룹화하여 관리하기 쉽게 합니다.
 */
@Entity("pet")
export class PetOrmEntity
  extends PetIdColumn
  implements
    PetBasicInfoColumn,
    PetAdditionalInfoColumn,
    PetOwnerInfoColumn,
    PetMetadataColumn
{
  // PetBasicInfoColumn 구현
  name: string;
  age: number;
  gender: PetGender;
  breed: PetBreed;
  size: PetSize;

  // PetAdditionalInfoColumn 구현
  personalities: PetPersonality[];
  imageUrls: string[] | null;
  description: string | null;

  // PetOwnerInfoColumn 구현
  ownerId: string;

  // PetMetadataColumn 구현
  createdAt: Date;
  updatedAt: Date;

  /**
   * 강아지의 소유자 (사용자) 참조
   */
  @ManyToOne(() => UserOrmEntity, (user) => user.pets)
  @JoinColumn({ name: "owner_id" })
  owner: UserOrmEntity;
}
