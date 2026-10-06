import { PairEntity } from "#app/pair/domain/model/pair";
import { PairOrmEntity, LikeOrmEntity, ref } from "@core/database/mikro";

export class PairOrmMapper {
  static toDomain(orm: PairOrmEntity): PairEntity {
    return PairEntity.of({
      leftUserId: orm.leftUserId,
      rightUserId: orm.rightUserId,
      active: orm.active,
      unmatchedAt: orm.unmatchedAt,
      likeAId: orm.likeAId,
      likeBId: orm.likeBId,
    }).setPersistence(orm.id, orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: PairEntity): PairOrmEntity {
    const orm = new PairOrmEntity();
    orm.id = domain.id;
    orm.leftUserId = domain.leftUserId;
    orm.rightUserId = domain.rightUserId;
    orm.unmatchedAt = domain.unmatchedAt;
    orm.likeA = domain.likeAId ? ref(LikeOrmEntity, domain.likeAId) : null;
    orm.likeB = domain.likeBId ? ref(LikeOrmEntity, domain.likeBId) : null;
    orm.active = domain.active;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
