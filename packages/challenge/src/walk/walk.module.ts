import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../shared/challenge-infrastructure.module.js";
import { ActivityModule } from "../activity/activity.module.js";
import { DiaryModule } from "../diary/diary.module.js";
import { RoutePersistenceModule } from "../route/infrastructure/route-persistence.module.js";
import { WalkPersistenceModule } from "./infrastructure/walk-persistence.module.js";
import { WalkCommands } from "./application/walk.commands.js";
import { WalkQueries } from "./application/walk.queries.js";
import { WalkResolver } from "./infrastructure/gql/walk.resolver.js";
@Module({
  imports: [
    ChallengeInfrastructureModule,
    ActivityModule,
    DiaryModule,
    WalkPersistenceModule,
    RoutePersistenceModule,
  ],
  providers: [WalkCommands, WalkQueries, WalkResolver],
})
export class WalkModule {}
