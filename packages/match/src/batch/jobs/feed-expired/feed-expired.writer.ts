import { type ItemWriter } from "#app/batch/interface/writer";
import { FeedEntity } from "#app/feed/domain/model/feed";
import { EntityManager, FeedOrmEntity } from "@core/database/mikro";

export class FeedExpiredWriter implements ItemWriter<FeedEntity> {
  constructor(private readonly em: EntityManager, private readonly chunkSize = 1000) {}

  async write(items: FeedEntity[]): Promise<void> {
    if (!items.length) return;

    // id 모아 배치 처리 (IN 파라미터 과다 방지)
    const ids = items.map(i => i.id!).filter(Boolean);
    const now = new Date();

    for (let i = 0; i < ids.length; i += this.chunkSize) {
      const slice = ids.slice(i, i + this.chunkSize);

      await this.em.transactional(async (manager) => {
        await manager.nativeDelete(FeedOrmEntity, {
          id: { $in: slice },
          expiresAt: { $lt: now },
        });
        // feed_item 은 ON DELETE CASCADE 로 함께 제거
      });
    }
  }
}
