import { DAY_MS, koreaDate } from "../../shared/domain/calendar.js";
import {
  qualificationKey,
  type ChallengeActivity,
} from "../../activity/domain/activity.js";
import type {
  ChallengeEnrollment,
  ChallengeProgress,
} from "./challenge-enrollment.js";

export function progressFor(
  enrollment: ChallengeEnrollment,
  activities: readonly ChallengeActivity[],
  now: Date,
): ChallengeProgress {
  const deletedWalks = new Set(
    activities
      .filter(
        (a) => a.userId === enrollment.userId && a.kind === "WALK" && a.deleted,
      )
      .map((a) => a.sourceId),
  );
  const units = new Set<string>();
  for (const activity of activities) {
    const facts = activity.facts;
    if (
      activity.userId !== enrollment.userId ||
      !facts ||
      !qualificationKey(activity) ||
      !activity.qualifyingReceivedAt ||
      deletedWalks.has(facts.walkId)
    )
      continue;
    const expectedKind =
      enrollment.kind === "NEIGHBORHOOD_EXPLORER" ? "WALK" : "DIARY";
    if (activity.kind !== expectedKind) continue;
    const start = Date.parse(facts.walkStartedAt);
    const end = Date.parse(facts.walkEndedAt);
    const creditedAt =
      activity.kind === "DIARY" ? Date.parse(facts.diarySavedAt!) : end;
    if (
      start < enrollment.joinedAt.getTime() ||
      end >= enrollment.endsAt.getTime() ||
      (enrollment.cancelledAt && end >= enrollment.cancelledAt.getTime()) ||
      creditedAt >= enrollment.endsAt.getTime() ||
      activity.qualifyingReceivedAt.getTime() > end + DAY_MS ||
      activity.qualifyingReceivedAt.getTime() >= enrollment.settlesAt.getTime()
    )
      continue;
    units.add(
      activity.kind === "WALK" ? facts.routeId! : koreaDate(facts.walkEndedAt),
    );
  }
  const progressCount = Math.min(units.size, enrollment.targetCount);
  const status = enrollment.cancelledAt
    ? "CANCELLED"
    : progressCount >= enrollment.targetCount
      ? "COMPLETED"
      : now < enrollment.endsAt
        ? "ACTIVE"
        : now < enrollment.settlesAt
          ? "VERIFYING"
          : "EXPIRED";
  return {
    ...enrollment,
    progressCount,
    status,
    earnedRewardCode: status === "COMPLETED" ? enrollment.rewardCode : null,
  };
}
