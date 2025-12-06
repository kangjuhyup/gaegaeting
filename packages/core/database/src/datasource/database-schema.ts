import { ClientOrmEntity, ConversationOrmEntity, EventOrmEntity, FeedItemOrmEntity, FeedOrmEntity, GroupOrmEntity, GroupRoleOrmEntity, IdentityProviderOrmEntity, LikeOrmEntity, LocationOrmEntity, MainAreaOrmEntity, MessageAttachmentOrmEntity, MessageOrmEntity, MessageReactionOrmEntity, MessageReceiptOrmEntity, PairOrmEntity, ParticipantOrmEntity, PermissionOrmEntity, PetAttachmentOrmEntity, PetProfileOrmEntity, RoleInheritOrmEntity, RoleOrmEntity, RolePermissionOrmEntity, TenantClientOrmEntity, TenantConfigOrmEntity, TenantOrmEntity, UserAttachmentOrmEntity, UserGroupOrmEntity, UserIdentityOrmEntity, UserOrmEntity, UserProfileOrmEntity, UserRoleOrmEntity } from "@app/entity";

export const DatabaseSchema = {
  AUTH: "AUTH",
  USER: "USER",
  MATCH: "MATCH",
  CHAT : "CHAT",
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
    [DatabaseSchema.AUTH]: [TenantOrmEntity, TenantConfigOrmEntity, TenantClientOrmEntity, ClientOrmEntity, IdentityProviderOrmEntity, UserOrmEntity, UserIdentityOrmEntity, UserGroupOrmEntity, UserRoleOrmEntity, GroupOrmEntity, GroupRoleOrmEntity, RoleOrmEntity, RoleInheritOrmEntity, RolePermissionOrmEntity, PermissionOrmEntity, EventOrmEntity],
    [DatabaseSchema.USER]: [UserProfileOrmEntity, PetProfileOrmEntity, UserAttachmentOrmEntity, PetAttachmentOrmEntity],
    [DatabaseSchema.MATCH]: [PairOrmEntity, LikeOrmEntity, FeedOrmEntity, FeedItemOrmEntity, LocationOrmEntity, MainAreaOrmEntity],
    [DatabaseSchema.CHAT]: [ConversationOrmEntity, ParticipantOrmEntity, MessageOrmEntity, MessageAttachmentOrmEntity, MessageReceiptOrmEntity, MessageReactionOrmEntity],
  };

  // 중복 엔티티  제거를 위해 Set 사용
  const entitySet = new Set<any>();
  
  schema.forEach(s => {
    const entities = entityMap[s] || [];
    entities.forEach(entity => entitySet.add(entity));
  });

  return Array.from(entitySet);
}
