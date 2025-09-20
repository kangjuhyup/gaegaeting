import { PairEntity } from "@app/pair/domain/model/pair";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { PairOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { Brackets, DataSource } from "typeorm";
import { PairOrmMapper } from "./mapper/pair-orm.mapper";

@Injectable()
export class PairOrmRepository extends BaseRepository<PairOrmEntity> implements PairRepositoryPort {
    constructor(dataSource: DataSource) {
        super(PairOrmEntity, dataSource);
    }
    async savePair(pair: PairEntity): Promise<PairEntity> {
        const orm = await this.getRepository().save(PairOrmMapper.toOrm(pair))
        return PairOrmMapper.toDomain(orm)
    }
    async selectPairsFromUser(userId: string): Promise<PairEntity[]> {
        const qb = this.getRepository().createQueryBuilder()
        const orms = await qb.select()
            .where(new Brackets(qb => {
                qb.where('pair.leftUserId = :userId', { userId })
                  .orWhere('pair.rightUserId = :userId', { userId })
            }))
            .getMany();
        return orms.map(PairOrmMapper.toDomain)
    }
    async selectPairFromId(id: number): Promise<PairEntity> {
        const orm = await this.getRepository().findOneBy({ id })
        return PairOrmMapper.toDomain(orm)
    }
    async updatePair(pair: PairEntity): Promise<void> {
        await this.getRepository().update(pair.id, PairOrmMapper.toOrm(pair))
    }
}