import { UserOrmEntity } from "../entity/account/user";
import { PetOrmEntity } from "../entity/account/pet";
import { AuthOrmEntity, FeedItemOrmEntity, FeedOrmEntity, LikeOrmEntity, LocationOrmEntity, MainAreaOrmEntity, PairOrmEntity, PetAttachmentOrmEntity, UserAttachmentOrmEntity } from "@app/entity";

export const DatabaseSchema = {
  USER: "USER",
  MATCH: "MATCH"
} as const;

export type DatabaseSchema =
  (typeof DatabaseSchema)[keyof typeof DatabaseSchema];

/**
 * 스키마에 따라 해당하는 엔티티를 가져옵니다.
 * @param schema 데이터베이스 스키마 배열
 * @returns 엔티티 배열
 */
export function getEntitiesBySchema(schema: DatabaseSchema[]): any[] {
  const entityMap = {
    [DatabaseSchema.USER]: [UserOrmEntity, PetOrmEntity, AuthOrmEntity, UserAttachmentOrmEntity, PetAttachmentOrmEntity],
    [DatabaseSchema.MATCH]: [PairOrmEntity, LikeOrmEntity, FeedOrmEntity, FeedItemOrmEntity, LocationOrmEntity, MainAreaOrmEntity],
  };

  // 중복 엔티티 제거를 위해 Set 사용
  const entitySet = new Set<any>();
  
  schema.forEach(s => {
    const entities = entityMap[s] || [];
    entities.forEach(entity => entitySet.add(entity));
  });

  return Array.from(entitySet);
}
