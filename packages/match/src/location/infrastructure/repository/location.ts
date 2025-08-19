import { LocationEntity } from "@app/location/domain/model/location";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LocationOrmEntity } from "@core/database";
import { Repository } from "typeorm";
import { LocationOrmMapper } from "./mapper/location-orm";

@Injectable()
export class LocationOrmRepository implements LocationRepositoryPort {

    constructor(
        @InjectRepository(LocationOrmEntity)
        private readonly locationRepository : Repository<LocationOrmEntity>
    ) {}

    async saveLocation(location: LocationEntity): Promise<LocationEntity> {
        const locationOrm = LocationOrmMapper.toOrm(location);
        const insertedLocation = await this.locationRepository.save(locationOrm);
        return LocationOrmMapper.toDomain(insertedLocation);
    }
    
    async selectLocationFromUserId(userId: string): Promise<LocationEntity> {
        const orm = await this.locationRepository.findOneBy({ userId });
        return LocationOrmMapper.toDomain(orm);
    }
}