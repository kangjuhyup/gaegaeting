import { LocationEntity } from "#app/location/domain/model/location";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { Injectable } from "@nestjs/common";
import { EntityManager, LocationOrmEntity } from "@core/database/mikro";
import { LocationOrmMapper } from "./mapper/location-orm.js";
import { YYYYMMDD } from "@core/util";

@Injectable()
export class LocationOrmRepository implements LocationRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    async saveLocation(location: LocationEntity): Promise<LocationEntity> {
        const locationOrm = LocationOrmMapper.toOrm(location);
        const insertedLocation = await this.entityManager.upsert(LocationOrmEntity, locationOrm);
        return LocationOrmMapper.toDomain(insertedLocation);
    }
    
    async selectLocationFromUserId(userId: string): Promise<LocationEntity> {
        const orm = await this.entityManager.findOne(LocationOrmEntity, { userId });
        if(!orm) return null;
        return LocationOrmMapper.toDomain(orm);
    }

    async findNearbyTargets(
        userId: string,
        latitude: number,
        longitude: number,
        date: YYYYMMDD,
        maxTargets: number = 2,
    ): Promise<string[]> {
        const radius = 10_000; // meters

        // 반경을 degree로 변환(박스 프리필터)
        const degLat = radius / 111_000;
        const degLng = radius / (111_000 * Math.cos((latitude * Math.PI) / 180));

        // 최근 7일 시작일(YYYYMMDD) — 오늘 포함 7일간 제외면 -6
        const d7 = date.subtract(6, 'day').toString();

        const limit = Math.max(0, Math.floor(maxTargets));
        if (limit === 0) return [];

        const rows = await this.entityManager.getConnection().execute<Array<{ targetId: string }>>(
          `SELECT location.user_id AS "targetId"
             FROM location
            WHERE location.user_id <> ?
              AND location.latitude BETWEEN ? AND ?
              AND location.longitude BETWEEN ? AND ?
              AND NOT EXISTS (
                    SELECT 1
                      FROM pair p
                     WHERE p.active = true
                       AND p.left_user_id = LEAST(?, location.user_id)
                       AND p.right_user_id = GREATEST(?, location.user_id)
                  )
              AND NOT EXISTS (
                    SELECT 1
                      FROM feed f
                      JOIN feed_item fi ON fi.feed_id = f.id
                     WHERE f.user_id = ?
                       AND f.date >= ?
                       AND fi.target_user_id = location.user_id
                  )
            ORDER BY 6371000 * acos(least(1, greatest(-1,
                       cos(radians(?)) * cos(radians(location.latitude))
                       * cos(radians(location.longitude) - radians(?))
                       + sin(radians(?)) * sin(radians(location.latitude))
                     ))) ASC
            LIMIT ${limit}`,
          [
            userId,
            latitude - degLat,
            latitude + degLat,
            longitude - degLng,
            longitude + degLng,
            userId,
            userId,
            userId,
            d7,
            latitude,
            longitude,
            latitude,
          ],
        );

        return rows.map((r) => r.targetId);
    }
}
