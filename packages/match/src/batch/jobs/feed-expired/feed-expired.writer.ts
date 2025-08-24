import { ItemWriter } from "@app/batch/interface/writer";
import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedOrmEntity } from "@core/database";
import { EntityManager, In } from "typeorm";

export class FeedExpiredWriter implements ItemWriter<FeedEntity> {
  constructor(private readonly em: EntityManager, private readonly chunkSize = 1000) {}

  async write(items: FeedEntity[]): Promise<void> {
    if (!items.length) return;

    // id 모아 배치 처리 (IN 파라미터 과다 방지)
    const ids = items.map(i => i.id!).filter(Boolean);
    const now = new Date();

    for (let i = 0; i < ids.length; i += this.chunkSize) {
      const slice = ids.slice(i, i + this.chunkSize);

      await this.em.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .delete()
          .from(FeedOrmEntity)
          .where({ id: In(slice) })
          .andWhere('expires_at < :now', { now })
          .execute();
        // feed_item 은 ON DELETE CASCADE 로 함께 제거
      });
    }
  }
}