import { LocationEntity } from "@app/location/domain/model/location";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FeedItemOrmEntity, FeedOrmEntity, LocationOrmEntity, PairOrmEntity } from "@core/database";
import { Repository } from "typeorm";
import { LocationOrmMapper } from "./mapper/location-orm";
import { YYYYMMDD } from "@core/util";

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

    async findNearbyTargets(userId: string, latitude: number, longitude: number, date: YYYYMMDD): Promise<string[]> {
        const radius = 10_000; // meters

        // 반경을 degree로 변환(박스 프리필터)
        const degLat = radius / 111_000;
        const degLng = radius / (111_000 * Math.cos((latitude * Math.PI) / 180));

        // 최근 7일 시작일(YYYYMMDD) — 오늘 포함 7일간 제외면 -6
        const d7 = date.subtract(6, 'day').toString();

        const qb = this.locationRepository.createQueryBuilder('location');

        // 활성 Pair 제외
        const pairSub = qb
          .subQuery()
          .select('1')
          .from(PairOrmEntity, 'p')
          .where('p.active = 1')
          .andWhere('p.left_user_id  = LEAST(:viewerId, location.user_id)')
          .andWhere('p.right_user_id = GREATEST(:viewerId, location.user_id)')
          .getQuery();

        // 최근 7일 노출 제외
        const recentSub = qb
          .subQuery()
          .select('1')
          .from(FeedOrmEntity, 'f')
          .innerJoin(FeedItemOrmEntity, 'fi', 'fi.feed_id = f.id')
          .where('f.user_id = :viewerId')
          .andWhere('f.date >= :d7') // 문자열 YYYYMMDD
          .andWhere('fi.target_user_id = location.user_id')
          .getQuery();

        const rows = await qb
          .select('location.user_id', 'targetId')
          .addSelect(
            // 축 순서 명확: POINT(lon,lat)
            'ST_Distance_Sphere(location.location_point, ST_SRID(POINT(:lng, :lat), 4326))',
            'dist_m',
          )
          .where('location.user_id <> :viewerId', { viewerId: userId })
          .andWhere('location.latitude BETWEEN :latMin AND :latMax', {
            latMin: latitude - degLat,
            latMax: latitude + degLat,
          })
          .andWhere('location.longitude BETWEEN :lngMin AND :lngMax', {
            lngMin: longitude - degLng,
            lngMax: longitude + degLng,
          })
          .andWhere(`NOT EXISTS ${pairSub}`)
          .andWhere(`NOT EXISTS ${recentSub}`)
          .setParameters({
            viewerId: userId,
            d7,
            lat: latitude,
            lng: longitude,
          })
          .orderBy(
            'ST_Distance_Sphere(location.location_point, ST_SRID(POINT(:lng, :lat), 4326))',
            'ASC',
          )
          .getRawMany<{ targetId: string; dist_m: number }>();

        return rows.map((r) => r.targetId);
    }
}