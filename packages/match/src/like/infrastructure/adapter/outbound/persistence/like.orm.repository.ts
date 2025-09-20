import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";
import { Injectable } from "@nestjs/common";
import { LikeOrmEntity, BaseRepository } from "@core/database";
import { DataSource } from "typeorm";
import { LikeOrmMapper } from "./mapper/like-orm.mapper";
import { LikeEntity } from "@app/like/domain/model/like";

@Injectable()
export class LikeOrmRepository extends BaseRepository<LikeOrmEntity> implements LikeRepositoryPort {
    constructor(dataSource: DataSource) {
        super(LikeOrmEntity, dataSource);
    }
    async selectLikeFromId(likeId: number): Promise<LikeEntity> {
        const orm = await this.getRepository().findOneBy({id : likeId})
        return LikeOrmMapper.toDomain(orm)
    }
    async updateLike(like: LikeEntity): Promise<LikeEntity> {
        const orm = await this.getRepository().save(LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
    async selectLikeInFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.getRepository().find({where : {likeeId : userId}})
        return orm.map(LikeOrmMapper.toDomain)
    }
    async selectLikeOutFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.getRepository().find({where : {likerId : userId}})
        return orm.map(LikeOrmMapper.toDomain)
    }

    async saveLike(like:LikeEntity) : Promise<LikeEntity> {
        const orm = await this.getRepository().save(LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
}