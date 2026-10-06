import { PairEntity } from "#app/pair/domain/model/pair";
import { PairRepositoryPort } from "#app/pair/domain/port/pair.repository.port";
import { EntityManager, PairOrmEntity } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { PairOrmMapper } from "./mapper/pair-orm.mapper.js";

@Injectable()
export class PairOrmRepository implements PairRepositoryPort {
  constructor(private readonly entityManager: EntityManager) {}
  async savePair(pair: PairEntity): Promise<PairEntity> {
    const orm = await this.entityManager.upsert(
      PairOrmEntity,
      PairOrmMapper.toOrm(pair),
    );
    return orm ? PairOrmMapper.toDomain(orm) : null;
  }
  async selectPairsFromUser(userId: string): Promise<PairEntity[]> {
    const orms = await this.entityManager.find(PairOrmEntity, {
      $or: [{ leftUserId: userId }, { rightUserId: userId }],
    });
    return orms.map(PairOrmMapper.toDomain);
  }
  async selectPairFromId(id: number): Promise<PairEntity> {
    const orm = await this.entityManager.findOne(PairOrmEntity, { id });
    return orm ? PairOrmMapper.toDomain(orm) : null;
  }
  async updatePair(pair: PairEntity): Promise<void> {
    await this.entityManager.nativeUpdate(
      PairOrmEntity,
      { id: pair.id },
      PairOrmMapper.toOrm(pair),
    );
  }
}
