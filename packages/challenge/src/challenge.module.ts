import { WalkModule } from "./walk/walk.module.js";
import { WalkPersistenceModule } from "./walk/infrastructure/walk-persistence.module.js";
import { RouteModule } from "./route/route.module.js";
import { RoutePersistenceModule } from "./route/infrastructure/route-persistence.module.js";
import { DiaryModule } from "./diary/diary.module.js";
import { DiaryPersistenceModule } from "./diary/infrastructure/diary-persistence.module.js";
import { Module } from "@nestjs/common";
import { ActivityModule } from "./activity/activity.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { ParticipationModule } from "./participation/participation.module.js";
import { ChallengeInfrastructureModule } from "./shared/challenge-infrastructure.module.js";
import { ChallengeUserDataController } from "./user-data/challenge-user-data.controller.js";
import { DeleteChallengeUserDataCommand } from "./user-data/delete-challenge-user-data.command.js";

@Module({
  imports: [
    WalkModule,
    WalkPersistenceModule,
    RouteModule,
    RoutePersistenceModule,
    DiaryModule,
    DiaryPersistenceModule,
    CatalogModule,
    ParticipationModule,
    ActivityModule,
    ChallengeInfrastructureModule,
  ],
  providers: [DeleteChallengeUserDataCommand],
  controllers: [ChallengeUserDataController],
})
export class ChallengeModule {}
