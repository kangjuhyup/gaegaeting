import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { ChallengeInfrastructureModule } from "../shared/challenge-infrastructure.module.js";
import { ParticipationCommands } from "./application/participation.commands.js";
import { ParticipationQueries } from "./application/participation.queries.js";
import { ParticipationResolver } from "./infrastructure/gql/participation.resolver.js";

@Module({
  imports: [CatalogModule, ChallengeInfrastructureModule],
  providers: [
    ParticipationCommands,
    ParticipationQueries,
    ParticipationResolver,
  ],
})
export class ParticipationModule {}
