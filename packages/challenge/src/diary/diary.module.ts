import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../shared/challenge-infrastructure.module.js";
import { ActivityModule } from "../activity/activity.module.js";
import { WalkPersistenceModule } from "../walk/infrastructure/walk-persistence.module.js";
import { RoutePersistenceModule } from "../route/infrastructure/route-persistence.module.js";
import { DiaryPersistenceModule } from "./infrastructure/diary-persistence.module.js";
import { DiaryCommands } from "./application/diary.commands.js";
import { DiaryQueries } from "./application/diary.queries.js";
import { PhotoService } from "./application/photo.service.js";
import { WalkingPhotoStorage } from "./application/walking-photo-storage.port.js";
import { WalkingPhotoStorageAdapter } from "./infrastructure/storage/walking-photo-storage.adapter.js";
import { MediaCleanupWorker } from "./infrastructure/storage/media-cleanup.worker.js";
import { DiaryResolver } from "./infrastructure/gql/diary.resolver.js";
@Module({
  imports: [
    ChallengeInfrastructureModule,
    ActivityModule,
    WalkPersistenceModule,
    RoutePersistenceModule,
    DiaryPersistenceModule,
  ],
  providers: [
    DiaryCommands,
    DiaryQueries,
    PhotoService,
    DiaryResolver,
    MediaCleanupWorker,
    { provide: WalkingPhotoStorage, useClass: WalkingPhotoStorageAdapter },
  ],
  exports: [DiaryCommands],
})
export class DiaryModule {}
