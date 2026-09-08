import { type ItemProcessor } from "#app/batch/interface/processor";
import { LocationEntity } from "#app/location/domain/model/location";
import { EntityManager } from "@core/database/mikro";
import { YYYYMMDD } from "@core/util";

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

    const rows = await this.em.getConnection().execute<Array<{ targetId: string }>>(
      `SELECT location.user_id AS "targetId"
         FROM location
        WHERE location.user_id <> ?
          AND location.latitude BETWEEN ? AND ?
          AND location.longitude BETWEEN ? AND ?
          AND NOT EXISTS (
                SELECT 1 FROM pair p
                 WHERE p.active = true
                   AND p.left_user_id = LEAST(?, location.user_id)
                   AND p.right_user_id = GREATEST(?, location.user_id)
              )
          AND NOT EXISTS (
                SELECT 1 FROM feed f
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
        LIMIT 2`,
      [
        viewerId,
        latitude - degLat,
        latitude + degLat,
        longitude - degLng,
        longitude + degLng,
        viewerId,
        viewerId,
        viewerId,
        d7,
        latitude,
        longitude,
        latitude,
      ],
    );

    if (rows.length === 0) return null;

    const targets = rows.slice(0, 2).map(r => r.targetId);
    return { viewerId, targets };
  }
}
