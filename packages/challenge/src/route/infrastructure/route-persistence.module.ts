import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../../shared/challenge-infrastructure.module.js";
import { RouteRepository } from "../application/route.repository.js";
import { RouteOrmRepository } from "./persistence/route.orm.repository.js";
@Module({
  imports: [ChallengeInfrastructureModule],
  providers: [{ provide: RouteRepository, useClass: RouteOrmRepository }],
  exports: [RouteRepository],
})
export class RoutePersistenceModule {}
