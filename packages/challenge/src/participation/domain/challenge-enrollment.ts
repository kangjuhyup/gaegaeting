import type { ChallengeKind } from "../../catalog/domain/challenge-definition.js";
import { DAY_MS, koreaDate } from "../../shared/domain/calendar.js";

export type ChallengeStatus =
  | "ACTIVE"
  | "VERIFYING"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export interface ChallengeEnrollment {
  id: string;
  userId: string;
  requestId: string;
  kind: ChallengeKind;
  title: string;
  targetCount: number;
  rewardCode: string;
  policyVersion: number;
  joinedAt: Date;
  endsAt: Date;
  settlesAt: Date;
  cancelledAt: Date | null;
  isCurrent: boolean;
}

export interface ChallengeProgress extends ChallengeEnrollment {
  progressCount: number;
  status: ChallengeStatus;
  earnedRewardCode: string | null;
}

/** Exclusive midnight boundary after the last Korean calendar day. */
export function challengeEndsAt(joinedAt: Date, durationDays: number): Date {
  const date = koreaDate(joinedAt);
  return new Date(
    new Date(`${date}T00:00:00+09:00`).getTime() + durationDays * DAY_MS,
  );
}
