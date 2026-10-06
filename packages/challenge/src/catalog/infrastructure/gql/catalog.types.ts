import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import type { ChallengeKind } from "../../domain/challenge-definition.js";

export const challengeKinds = {
  NEIGHBORHOOD_EXPLORER: "NEIGHBORHOOD_EXPLORER",
  WALK_DIARY: "WALK_DIARY",
} as const;
registerEnumType(challengeKinds, { name: "ChallengeKind" });

@ObjectType("ChallengeDefinition")
export class ChallengeDefinitionType {
  @Field(() => challengeKinds) kind!: ChallengeKind;
  @Field() title!: string;
  @Field() description!: string;
  @Field(() => Int) durationDays!: number;
  @Field(() => Int) targetCount!: number;
  @Field() rewardCode!: string;
  @Field(() => Int) policyVersion!: number;
}
