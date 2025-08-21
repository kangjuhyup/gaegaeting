import { ItemProcessor } from "@app/batch/interface/processor";
import { LocationEntity } from "@app/location/domain/model/location";
import { LocationOrmEntity, PairOrmEntity, FeedOrmEntity, FeedItemOrmEntity } from "@core/database";
import { YYYYMMDD } from "@core/util";
import { EntityManager } from "typeorm";

export interface Candidate {
    viewerId: string;
    targets: string[]; // 최대 2명
}

export class DailyFeedProcessor implements ItemProcessor<LocationEntity, Candidate> {
  constructor(
    private readonly em: EntityManager,
    private readonly date: YYYYMMDD,
    private readonly radius = 10_000,
  ) {}

  async process(item: LocationEntity): Promise<Candidate | null> {
    const { id: viewerId, latitude, longitude } = item;

    // 반경을 degree로 변환(박스 프리필터)
    const degLat = this.radius / 111_000;
    const degLng = this.radius / (111_000 * Math.cos((latitude * Math.PI) / 180));

    // 최근 7일 시작일(YYYYMMDD) — 오늘 포함 7일간 제외면 -6
    const d7 = this.date.subtract(6, 'day').toString();

    const qb = this.em.getRepository(LocationOrmEntity).createQueryBuilder('location');

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
      .where('location.user_id <> :viewerId', { viewerId })
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
        viewerId,
        d7,
        lat: latitude,
        lng: longitude,
      })
      .orderBy(
        'ST_Distance_Sphere(location.location_point, ST_SRID(POINT(:lng, :lat), 4326))',
        'ASC',
      )
      .limit(2)
      .getRawMany<{ targetId: string; dist_m: number }>();

    if (rows.length === 0) return null;

    const targets = rows.slice(0, 2).map(r => r.targetId);
    return { viewerId, targets };
  }
}
