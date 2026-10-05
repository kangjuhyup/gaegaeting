import { DAY_MS } from "../src/shared/domain/calendar.js";
import type { ChallengeKind } from "../src/catalog/domain/challenge-definition.js";
import { randomUUID } from "node:crypto";
import {
  challengeEndsAt,
  type ChallengeEnrollment,
} from "../src/participation/domain/challenge-enrollment.js";
import type {
  ActivityUpdate,
  ChallengeActivity,
} from "../src/activity/domain/activity.js";

export const NOW = new Date("2026-10-05T12:00:00+09:00");

export function participation(
  kind: ChallengeKind = "NEIGHBORHOOD_EXPLORER",
): ChallengeEnrollment {
  const joinedAt = new Date("2026-10-05T09:00:00+09:00");
  const endsAt = challengeEndsAt(joinedAt, kind === "WALK_DIARY" ? 7 : 14);
  return {
    id: "01K00000000000000000000001",
    userId: "viewer",
    requestId: randomUUID(),
    kind,
    title: "챌린지",
    targetCount: 3,
    rewardCode: "TEST_REWARD",
    policyVersion: 1,
    joinedAt,
    endsAt,
    settlesAt: new Date(endsAt.getTime() + DAY_MS),
    cancelledAt: null,
    isCurrent: true,
  };
}

export function walk(
  sourceId = "walk-1",
  routeId = "route-1",
  date = "2026-10-05",
): ChallengeActivity {
  return {
    userId: "viewer",
    kind: "WALK",
    sourceId,
    revision: 1,
    deleted: false,
    walkId: sourceId,
    facts: {
      walkId: sourceId,
      walkStartedAt: `${date}T10:00:00+09:00`,
      walkEndedAt: `${date}T10:30:00+09:00`,
      distanceMeters: 1000,
      routeId,
      routeAuthorId: "author",
      completed: true,
    },
    occurredAt: new Date(`${date}T10:30:00+09:00`),
    receivedAt: new Date(`${date}T10:35:00+09:00`),
    qualifyingReceivedAt: new Date(`${date}T10:35:00+09:00`),
  };
}

export function diary(
  sourceId = "diary-1",
  date = "2026-10-05",
): ChallengeActivity {
  const original = walk(`walk-${sourceId}`, "unused", date);
  return {
    ...original,
    kind: "DIARY",
    sourceId,
    facts: {
      walkId: original.walkId!,
      walkStartedAt: original.facts!.walkStartedAt,
      walkEndedAt: original.facts!.walkEndedAt,
      distanceMeters: 1000,
      diarySavedAt: `${date}T10:32:00+09:00`,
      hasPhoto: true,
      mood: "HAPPY",
    },
  };
}

export function input(activity: ChallengeActivity): ActivityUpdate {
  const { userId, kind, sourceId, revision, deleted, facts } = activity;
  return { userId, kind, sourceId, revision, deleted, facts };
}
