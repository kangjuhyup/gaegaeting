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

    async saveLike(like:LikeEntity) : Promise<LikeEntity> {
        const orm = await this.likeRepository.save(LikeOrmMapper.toOrm(like))
        return LikeOrmMapper.toDomain(orm)
    }
}