import type { EntityClass } from '@mikro-orm/core';
import { DatabaseSchema } from '../../database-schema.js';
import {
  ExternalUserSubjectOrmEntity,
  PetAttachmentOrmEntity,
  PetProfileOrmEntity,
  UserAttachmentOrmEntity,
  UserProfileOrmEntity,
  UserReportOrmEntity,
} from '../entity/account/index.js';
import {
  FeedItemOrmEntity,
  FeedOrmEntity,
  LikeOrmEntity,
  LocationOrmEntity,
  MainAreaOrmEntity,
  PairOrmEntity,
} from '../entity/match/index.js';
import {
  ConversationOrmEntity,
  MessageAttachmentOrmEntity,
  MessageOrmEntity,
  MessageReactionOrmEntity,
  MessageReceiptOrmEntity,
  ParticipantOrmEntity,
} from '../entity/chat/index.js';

type MikroEntity = EntityClass<Partial<any>>;

export const MIKRO_USER_ENTITIES = Object.freeze([
  UserProfileOrmEntity,
  ExternalUserSubjectOrmEntity,
  PetProfileOrmEntity,
  UserAttachmentOrmEntity,
  PetAttachmentOrmEntity,
  UserReportOrmEntity,
]) satisfies readonly MikroEntity[];
export const MIKRO_MATCH_ENTITIES = Object.freeze([
  PairOrmEntity,
  LikeOrmEntity,
  FeedOrmEntity,
  FeedItemOrmEntity,
  LocationOrmEntity,
  MainAreaOrmEntity,
]) satisfies readonly MikroEntity[];
export const MIKRO_CHAT_ENTITIES = Object.freeze([
  ConversationOrmEntity,
  ParticipantOrmEntity,
  MessageOrmEntity,
  MessageAttachmentOrmEntity,
  MessageReceiptOrmEntity,
  MessageReactionOrmEntity,
]) satisfies readonly MikroEntity[];

const ENTITIES_BY_SCHEMA: Record<DatabaseSchema, readonly MikroEntity[]> = {
  [DatabaseSchema.USER]: MIKRO_USER_ENTITIES,
  [DatabaseSchema.MATCH]: MIKRO_MATCH_ENTITIES,
  [DatabaseSchema.CHAT]: MIKRO_CHAT_ENTITIES,
};

export function getMikroEntitiesBySchema(
  schemas: DatabaseSchema[],
): MikroEntity[] {
  if (schemas.length === 0) {
    throw new Error('At least one database schema is required');
  }

  return [...new Set(schemas.flatMap(schema => ENTITIES_BY_SCHEMA[schema]))];
}
