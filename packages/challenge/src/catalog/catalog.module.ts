import { Module } from "@nestjs/common";
import { ChallengeCatalogQueries } from "./application/challenge-catalog.queries.js";
import { ChallengeCatalogResolver } from "./infrastructure/gql/catalog.resolver.js";

@Module({
  providers: [ChallengeCatalogQueries, ChallengeCatalogResolver],
  exports: [ChallengeCatalogQueries],
})
export class CatalogModule {}
