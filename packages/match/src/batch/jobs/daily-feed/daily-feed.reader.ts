import { ItemReader } from "@app/batch/interface/reader";
import { LocationEntity } from "@app/location/domain/model/location";
import { LocationOrmEntity } from "@core/database";
import { EntityManager } from "typeorm";

export class DailyFeedReader implements ItemReader<LocationEntity> {
    private buffer: LocationEntity[] = [];
    private cursor: string | null = null;
    private ended = false;
  
    constructor(
      private readonly em: EntityManager,
      private readonly pageSize = 1000,
    ) {}
  
    async read(): Promise<LocationEntity | null> {
      // 버퍼가 비었을 때만 페치
      if (this.buffer.length === 0) {
        // 이미 마지막까지 갔으면 종료
        if (this.ended) return null;
  
        const qb = this.em
          .createQueryBuilder()
          .select('loc.user_id', 'userId')
          .addSelect('loc.latitude', 'latitude')
          .addSelect('loc.longitude', 'longitude')
          .addSelect('loc.created_at', 'createdAt')
          .addSelect('loc.updated_at', 'updatedAt')
          .from(LocationOrmEntity, 'loc')
          .orderBy('loc.user_id', 'ASC')
          .take(this.pageSize);
  
        // 커서가 있을 때만 키셋 조건
        if (this.cursor) {
          qb.where('loc.user_id > :cursor', { cursor: this.cursor });
        }
  
        const rows = await qb.getRawMany<{
          userId: string;
          latitude: number;
          longitude: number;
          createdAt: Date;
          updatedAt: Date;
        }>();
  
        if (rows.length === 0) {
          this.ended = true;
          return null;
        }
  
        this.buffer = rows.map((r) =>
          LocationEntity.of({ latitude: r.latitude, longitude: r.longitude })
            .setPersistence(r.userId, r.createdAt, r.updatedAt),
        );
  
        // 다음 페이지를 위한 커서 갱신
        this.cursor = this.buffer[this.buffer.length - 1].id;
  
        // 다음 호출에서 새 페치를 시도하지 않도록 플래그만 미리 표시(버퍼는 그대로 둠)
        if (rows.length < this.pageSize) {
          this.ended = true; // ← 버퍼가 남아 있어도 OK. 다음 호출에서 buffer.length > 0 이라 그냥 shift 된다.
        }
      }
  
      return this.buffer.shift() ?? null;
    }
  }
  