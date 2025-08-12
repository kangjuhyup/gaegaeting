import { UserOrmEntity } from "../entity/user";
import { PetOrmEntity } from "../entity/pet";
import { AuthOrmEntity } from "@app/entity";

export const DatabaseSchema = {
  USER: "USER",
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
    [DatabaseSchema.USER]: [UserOrmEntity, PetOrmEntity, AuthOrmEntity],
    // 다른 스키마에 따른 엔티티들을 추가할 수 있습니다.
  };

  // 중복 엔티티 제거를 위해 Set 사용
  const entitySet = new Set<any>();
  
  schema.forEach(s => {
    const entities = entityMap[s] || [];
    entities.forEach(entity => entitySet.add(entity));
  });

  return Array.from(entitySet);
}
