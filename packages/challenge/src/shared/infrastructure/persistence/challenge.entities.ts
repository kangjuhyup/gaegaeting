import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import type {
  ActivityFacts,
  ActivityKind,
} from "../../../activity/domain/activity.js";
import type { ChallengeKind } from "../../../catalog/domain/challenge-definition.js";

@Entity({ tableName: "challenge_enrollment" })
@Unique({ name: "uq_challenge_request", properties: ["userId", "requestId"] })
@Unique({
  name: "uq_challenge_current",
  properties: ["userId", "kind"],
  where: { isCurrent: true },
})
@Index({ name: "ix_challenge_user_joined", properties: ["userId", "joinedAt"] })
export class ChallengeEnrollmentEntity {
  @PrimaryKey({ columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "request_id", columnType: "uuid" }) requestId!: string;
  @Property({ columnType: "varchar(32)" }) kind!: ChallengeKind;
  @Property({ columnType: "varchar(100)" }) title!: string;
  @Property({ fieldName: "target_count", columnType: "integer" })
  targetCount!: number;
  @Property({ fieldName: "reward_code", columnType: "varchar(64)" })
  rewardCode!: string;
  @Property({ fieldName: "policy_version", columnType: "integer" })
  policyVersion!: number;
  @Property({ fieldName: "joined_at", columnType: "timestamptz" })
  joinedAt!: Date;
  @Property({ fieldName: "ends_at", columnType: "timestamptz" }) endsAt!: Date;
  @Property({ fieldName: "settles_at", columnType: "timestamptz" })
  settlesAt!: Date;
  @Property({
    fieldName: "cancelled_at",
    columnType: "timestamptz",
    nullable: true,
  })
  cancelledAt!: Date | null;
  @Property({ fieldName: "is_current", columnType: "boolean" })
  isCurrent!: boolean;
}

@Entity({ tableName: "challenge_activity" })
@Index({
  name: "ix_challenge_activity_time",
  properties: ["userId", "occurredAt"],
})
export class ChallengeActivityEntity {
  @PrimaryKey({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @PrimaryKey({ columnType: "varchar(8)" }) kind!: ActivityKind;
  @PrimaryKey({ fieldName: "source_id", columnType: "varchar(128)" })
  sourceId!: string;
  @Property({ columnType: "integer" }) revision!: number;
  @Property({ columnType: "boolean" }) deleted!: boolean;
  @Property({
    fieldName: "walk_id",
    columnType: "varchar(128)",
    nullable: true,
  })
  walkId!: string | null;
  @Property({ type: "json", columnType: "jsonb", nullable: true })
  facts!: ActivityFacts | null;
  @Property({
    fieldName: "occurred_at",
    columnType: "timestamptz",
    nullable: true,
  })
  occurredAt!: Date | null;
  @Property({ fieldName: "received_at", columnType: "timestamptz" })
  receivedAt!: Date;
  @Property({
    fieldName: "qualifying_received_at",
    columnType: "timestamptz",
    nullable: true,
  })
  qualifyingReceivedAt!: Date | null;
}

@Entity({ tableName: "challenge_deleted_user" })
export class ChallengeDeletedUserEntity {
  @PrimaryKey({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
}

export const CHALLENGE_ENTITIES = [
  ChallengeEnrollmentEntity,
  ChallengeActivityEntity,
  ChallengeDeletedUserEntity,
];
