import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../shared/challenge-infrastructure.module.js";
import { ActivityCommands } from "./application/activity.commands.js";
import { ActivityController } from "./infrastructure/http/activity.controller.js";

@Module({
  imports: [ChallengeInfrastructureModule],
  providers: [ActivityCommands],
  exports: [ActivityCommands],
  controllers: [ActivityController],
})
export class ActivityModule {}
