import { Injectable } from "@nestjs/common";
import { MainAreaRepositoryPort } from "@app/location/domain/port/main-area.repository.port";
import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { MainAreaOrmEntity } from "@core/database";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MainAreaOrmMapper } from "./mapper/main-area-orm";

@Injectable()
export class MainAreaOrmRepository implements MainAreaRepositoryPort {
    
    constructor(
        @InjectRepository(MainAreaOrmEntity)
        private readonly mainAreaRepository : Repository<MainAreaOrmEntity>
    ) {}
    
    async saveMainArea(mainArea: MainAreaEntity): Promise<MainAreaEntity> {
        const mainAreaOrm = MainAreaOrmMapper.toOrm(mainArea);
        const insertedMainArea = await this.mainAreaRepository.save(mainAreaOrm);
        return MainAreaOrmMapper.toDomain(insertedMainArea);
    }
    
    async selectMainAreaFromUserId(userId: string): Promise<MainAreaEntity | null> {
        const orm = await this.mainAreaRepository.findOneBy({ userId });
        if(!orm) return; 
        return MainAreaOrmMapper.toDomain(orm);
    }
}