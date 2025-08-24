import { ItemReader } from "@app/batch/interface/reader";
import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedOrmEntity } from "@core/database";
import { YYYYMMDD } from "@core/util";
import { EntityManager } from "typeorm";

type Cursor = { expiresAt: Date; id: number } | null;

export class FeedExpiredReader implements ItemReader<FeedEntity> {
  private buffer: FeedEntity[] = [];
  private cursor: Cursor = null;
  private ended = false;

  constructor(
    private readonly em: EntityManager,
    private readonly pageSize = 1000,
  ) {}

  async read(): Promise<FeedEntity | null> {
    if (this.buffer.length === 0) {
      if (this.ended) return null;

      const qb = this.em
        .createQueryBuilder()
        .select('fi.id', 'id')
        .addSelect('fi.user_id', 'userId')
        .addSelect('fi.date', 'date')
        .addSelect('fi.slot', 'slot')
        .addSelect('fi.expires_at', 'expiresAt')
        .addSelect('fi.created_at', 'createdAt')
        .addSelect('fi.updated_at', 'updatedAt')
        .from(FeedOrmEntity, 'fi')
        .where('fi.expires_at < :now', { now: new Date() })
        .orderBy('fi.expires_at', 'ASC')
        .addOrderBy('fi.id', 'ASC')
        .take(this.pageSize);

      if (this.cursor) {
        qb.andWhere(
          '(fi.expires_at > :curExp OR (fi.expires_at = :curExp AND fi.id > :curId))',
          { curExp: this.cursor.expiresAt, curId: this.cursor.id },
        );
      }

      const rows = await qb.getRawMany<{
        id: number;
        userId: string;
        date: string;
        slot: number;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
      }>();

      if (rows.length === 0) {
        this.ended = true;
        return null;
      }

      this.buffer = rows.map((r) =>
        FeedEntity.of({
          userId: r.userId,
          date: new YYYYMMDD(r.date),
          slot: r.slot,
          expiresAt: r.expiresAt,
        }).setPersistence(r.id, r.createdAt, r.updatedAt),
      );

      // 다음 커서 갱신
      const last = rows[rows.length - 1];
      this.cursor = { expiresAt: last.expiresAt, id: last.id };

      if (rows.length < this.pageSize) {
        this.ended = true;
      }
    }

    return this.buffer.shift() ?? null;
  }
}