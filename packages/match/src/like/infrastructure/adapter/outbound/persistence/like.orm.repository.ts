import { LikeRepositoryPort } from "#app/like/domain/port/like.repository.port";
import { Injectable } from "@nestjs/common";
import { EntityManager, LikeOrmEntity } from "@core/database/mikro";
import { LikeOrmMapper } from "./mapper/like-orm.mapper.js";
import { LikeEntity } from "#app/like/domain/model/like";

@Injectable()
export class LikeOrmRepository implements LikeRepositoryPort {
    constructor(private readonly entityManager: EntityManager) {}
    async selectLikeFromId(likeId: number): Promise<LikeEntity> {
        const orm = await this.entityManager.findOne(LikeOrmEntity, {id : likeId})
        return LikeOrmMapper.toDomain(orm)
    }
    async updateLike(like: LikeEntity): Promise<LikeEntity> {
        const orm = await this.entityManager.upsert(LikeOrmEntity, LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
    async selectLikeInFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.entityManager.find(LikeOrmEntity, {likeeId : userId})
        return orm.map(LikeOrmMapper.toDomain)
    }
    async selectLikeOutFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.entityManager.find(LikeOrmEntity, {likerId : userId})
        return orm.map(LikeOrmMapper.toDomain)
    }

    async saveLike(like:LikeEntity) : Promise<LikeEntity> {
        const orm = await this.entityManager.upsert(LikeOrmEntity, LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
}
