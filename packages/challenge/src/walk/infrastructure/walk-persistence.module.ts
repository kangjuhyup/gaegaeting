import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../../shared/challenge-infrastructure.module.js";
import { WalkRepository } from "../application/walk.repository.js";
import { WalkOrmRepository } from "./persistence/walk.orm.repository.js";
@Module({
  imports: [ChallengeInfrastructureModule],
  providers: [{ provide: WalkRepository, useClass: WalkOrmRepository }],
  exports: [WalkRepository],
})
export class WalkPersistenceModule {}
