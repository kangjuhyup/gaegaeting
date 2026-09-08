import { Injectable } from "@nestjs/common";
import { MainAreaRepositoryPort } from "#app/location/domain/port/main-area.repository.port";
import { MainAreaEntity } from "#app/location/domain/model/main-area";
import { EntityManager, MainAreaOrmEntity } from "@core/database/mikro";
import { MainAreaOrmMapper } from "./mapper/main-area-orm.js";

@Injectable()
export class MainAreaOrmRepository implements MainAreaRepositoryPort {
    
    constructor(private readonly entityManager: EntityManager) {}
    
    async saveMainArea(mainArea: MainAreaEntity): Promise<MainAreaEntity> {
        const mainAreaOrm = MainAreaOrmMapper.toOrm(mainArea);
        const insertedMainArea = await this.entityManager.upsert(MainAreaOrmEntity, mainAreaOrm);
        return MainAreaOrmMapper.toDomain(insertedMainArea);
    }
    
    async selectMainAreaFromUserId(userId: string): Promise<MainAreaEntity | null> {
        const orm = await this.entityManager.findOne(MainAreaOrmEntity, { userId });
        if(!orm) return; 
        return MainAreaOrmMapper.toDomain(orm);
    }
}
