import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LikeOrmEntity } from "@core/database";
import { Repository } from "typeorm";
import { LikeOrmMapper } from "./mapper/like-orm.mapper";
import { LikeEntity } from "@app/like/domain/model/like";

@Injectable()
export class LikeOrmRepository implements LikeRepositoryPort {
    constructor(
        @InjectRepository(LikeOrmEntity) private readonly likeRepository : Repository<LikeOrmEntity>
    ){}
    async selectLikeFromId(likeId: number): Promise<LikeEntity> {
        const orm = await this.likeRepository.findOneBy({id : likeId})
        return LikeOrmMapper.toDomain(orm)
    }
    async updateLike(like: LikeEntity): Promise<LikeEntity> {
        const orm = await this.likeRepository.save(LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
    async selectLikeInFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.likeRepository.find({where : {likeeId : userId}})
        return orm.map(LikeOrmMapper.toDomain)
    }
    async selectLikeOutFromUserId(userId: string): Promise<LikeEntity[]> {
        const orm = await this.likeRepository.find({where : {likerId : userId}})
        return orm.map(LikeOrmMapper.toDomain)
    }

    async saveLike(like:LikeEntity) : Promise<LikeEntity> {
        const orm = await this.likeRepository.save(LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
}