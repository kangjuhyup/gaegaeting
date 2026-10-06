import { GraphqlAccessGuard, Scopes } from "@core/auth";
import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import { ChallengeCatalogQueries } from "../../application/challenge-catalog.queries.js";
import { ChallengeDefinitionType } from "./catalog.types.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ChallengeCatalogResolver {
  constructor(private readonly queries: ChallengeCatalogQueries) {}

  @Query(() => [ChallengeDefinitionType])
  @Scopes("challenge:read")
  challenges() {
    return this.queries.definitions();
  }
}
