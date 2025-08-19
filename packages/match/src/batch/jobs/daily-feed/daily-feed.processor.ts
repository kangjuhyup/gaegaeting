import { ItemProcessor } from "@app/batch/interface/processor";
import { LocationEntity } from "@app/location/domain/model/location";
import { FeedItemOrmEntity, FeedOrmEntity, LocationOrmEntity, PairOrmEntity } from "@core/database";
import { DataSource } from "typeorm";

export interface Candidate {
    viewerId: string;
    targets: string[]; // 최대 2명
}

export class DailyFeedProcessor implements ItemProcessor<LocationEntity, Candidate> {

    constructor(
        private readonly ds : DataSource,
        private readonly sevenDaysAgo : string,
        private readonly radius = 10_000,
    ) {}

    async process(item : LocationEntity) : Promise<Candidate | null> {
        const { id, latitude, longitude } = item;

        const degLat = this.radius / 111_000;
        const degLng = this.radius / (111_000 * Math.cos((latitude*Math.PI/180)));

        const wkt = `POINT(${longitude} ${latitude})`;
        const qb = this.ds.getRepository(LocationOrmEntity).createQueryBuilder('location');
        // 서브쿼리: 활성 Pair 제외 (LEAST/GREATEST)
        const pairSub = qb
            .subQuery()
            .select('1')
            .from(PairOrmEntity, 'p')
            .where('p.active = 1')
            .andWhere('p.left_user_id  = LEAST(:viewerId, cand.user_id)')
            .andWhere('p.right_user_id = GREATEST(:viewerId, cand.user_id)')
            .getQuery();
        // 서브쿼리: 최근 7일 내 이미 노출된 후보 제외
        const recentSub = qb
            .subQuery()
            .select('1')
            .from(FeedOrmEntity, 'f')
            .innerJoin(FeedItemOrmEntity, 'fi', 'fi.feed_id = f.id')
            .where('f.user_id = :viewerId')
            .andWhere('f.date   >= :d7')
            .andWhere('fi.target_user_id = location.user_id')
            .getQuery();

        
        const rows = await qb
            .select('location.user_id', 'targetId')
            .addSelect(
              'ST_Distance_Sphere(location.location_point, ST_GeomFromText(:wkt, 4326))',
              'dist_m',
            )
            .where('location.user_id <> :viewerId', { viewerId: id })
            .andWhere('location.latitude  BETWEEN :latMin AND :latMax', {
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
              viewerId: id,
              d7: this.sevenDaysAgo,
              wkt,
            })
            .orderBy(
              'ST_Distance_Sphere(location.location_point, ST_GeomFromText(:wkt, 4326))',
              'ASC',
            )
            .limit(2)
            .getRawMany();

        if(rows.length === 0) return null;

        const [first, second] = rows;

        return {
            viewerId : id,
            targets : [first.targetId, second.targetId]
        };
    }
}