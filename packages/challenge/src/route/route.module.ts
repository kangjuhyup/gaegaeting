import { Module } from "@nestjs/common";
import { ChallengeInfrastructureModule } from "../shared/challenge-infrastructure.module.js";
import { WalkPersistenceModule } from "../walk/infrastructure/walk-persistence.module.js";
import { RoutePersistenceModule } from "./infrastructure/route-persistence.module.js";
import { RouteCommands } from "./application/route.commands.js";
import { RouteQueries } from "./application/route.queries.js";
import { RouteResolver } from "./infrastructure/gql/route.resolver.js";
@Module({
  imports: [
    ChallengeInfrastructureModule,
    WalkPersistenceModule,
    RoutePersistenceModule,
  ],
  providers: [RouteCommands, RouteQueries, RouteResolver],
})
export class RouteModule {}
