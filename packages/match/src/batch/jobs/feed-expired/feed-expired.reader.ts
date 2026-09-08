import { type ItemReader } from "#app/batch/interface/reader";
import { FeedEntity } from "#app/feed/domain/model/feed";
import { EntityManager, FeedOrmEntity } from "@core/database/mikro";
import { YYYYMMDD } from "@core/util";

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

      const cursorFilter = this.cursor
        ? {
            $or: [
              { expiresAt: { $gt: this.cursor.expiresAt } },
              { expiresAt: this.cursor.expiresAt, id: { $gt: this.cursor.id } },
            ],
          }
        : {};
      const rows = await this.em.find(
        FeedOrmEntity,
        { expiresAt: { $lt: new Date() }, ...cursorFilter },
        { orderBy: { expiresAt: 'ASC', id: 'ASC' }, limit: this.pageSize },
      );

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
