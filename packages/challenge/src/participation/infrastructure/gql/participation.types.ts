import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";
import { IsIn, IsUUID } from "class-validator";
import type { ChallengeKind } from "../../../catalog/domain/challenge-definition.js";
import { challengeKinds } from "../../../catalog/infrastructure/gql/catalog.types.js";
import type { ChallengeStatus } from "../../domain/challenge-enrollment.js";

const statuses = {
  ACTIVE: "ACTIVE",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
registerEnumType(statuses, { name: "ChallengeStatus" });

@ObjectType("ChallengeParticipation")
export class ChallengeParticipationType {
  @Field(() => ID) id!: string;
  @Field(() => challengeKinds) kind!: ChallengeKind;
  @Field() title!: string;
  @Field(() => Int) targetCount!: number;
  @Field(() => Int) progressCount!: number;
  @Field(() => statuses) status!: ChallengeStatus;
  @Field(() => GraphQLISODateTime) joinedAt!: Date;
  @Field(() => GraphQLISODateTime) endsAt!: Date;
  @Field(() => GraphQLISODateTime) settlesAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  cancelledAt!: Date | null;
  @Field(() => String, { nullable: true }) earnedRewardCode!: string | null;
  @Field(() => Int) policyVersion!: number;
}

@InputType()
export class JoinChallengeInput {
  @Field(() => challengeKinds)
  @IsIn(Object.values(challengeKinds))
  kind!: ChallengeKind;

  @Field()
  @IsUUID()
  requestId!: string;
}
