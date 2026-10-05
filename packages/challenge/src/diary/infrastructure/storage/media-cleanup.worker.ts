import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ChallengeClock } from "../../../shared/application/challenge-clock.js";
import { ChallengeTransaction } from "../../../shared/application/challenge-transaction.js";
import { DiaryRepository } from "../../application/diary.repository.js";
import { WalkingPhotoStorage } from "../../application/walking-photo-storage.port.js";

@Injectable()
export class MediaCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(MediaCleanupWorker.name);
  constructor(
    private readonly repository: DiaryRepository,
    private readonly transaction: ChallengeTransaction,
    private readonly storage: WalkingPhotoStorage,
    private readonly clock: ChallengeClock,
  ) {}
  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => {
      void this.run().catch(() =>
        this.logger.warn("산책 사진 정리를 다음 주기에 재시도합니다."),
      );
    }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const now = this.clock.now();
      for (const expired of await this.repository.expiredUploads(now)) {
        await this.transaction.run(expired.userId, async () => {
          const current = await this.repository.photo(expired.id);
          if (current?.status !== "UPLOADING") return;
          await this.repository.queueCleanup(current.uploadKey, now);
          await this.repository.removePhoto(current.id);
        });
      }
      for (const job of await this.repository.cleanupBatch(now, 50)) {
        let success = false;
        try {
          await this.storage.delete(job.objectKey);
          success = true;
        } catch {
          /* Durable retry below. */
        }
        await this.repository.cleanupResult(job.objectKey, success, now);
      }
    } finally {
      this.running = false;
    }
  }
}
