import { PairEntity } from "@app/pair/domain/model/pair";
import { PairRepositoryPort } from "@app/pair/domain/port/pair.repository.port";
import { PairOrmEntity } from "@core/database";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { PairOrmMapper } from "./mapper/pair-orm.mapper";

@Injectable()
export class PairOrmRepository implements PairRepositoryPort {
    constructor(
        @InjectRepository(PairOrmEntity)
        private readonly pairRepository : Repository<PairOrmEntity>
    ) {}
    async savePair(pair: PairEntity): Promise<PairEntity> {
        const orm = await this.pairRepository.save(PairOrmMapper.toOrm(pair))
        return PairOrmMapper.toDomain(orm)
    }
    async selectPairsFromUser(userId: string): Promise<PairEntity[]> {
        const qb = this.pairRepository.createQueryBuilder()
        const orms = await qb.select()
            .where(new Brackets(qb => {
                qb.where('pair.leftUserId = :userId', { userId })
                  .orWhere('pair.rightUserId = :userId', { userId })
            }))
            .getMany();
        return orms.map(PairOrmMapper.toDomain)
    }
    async selectPairFromId(id: number): Promise<PairEntity> {
        const orm = await this.pairRepository.findOneBy({ id })
        return PairOrmMapper.toDomain(orm)
    }
    async updatePair(pair: PairEntity): Promise<void> {
        await this.pairRepository.update(pair.id, PairOrmMapper.toOrm(pair))
    }
}