import { koreaDate } from "../../shared/domain/calendar.js";

export type ActivityKind = "WALK" | "DIARY";

/** Facts verified by the owning service; no raw coordinates, photos or diary text. */
export interface ActivityFacts {
  walkId: string;
  walkStartedAt: string;
  walkEndedAt: string;
  distanceMeters: number;
  routeId?: string | null;
  routeAuthorId?: string | null;
  completed?: boolean;
  diarySavedAt?: string;
  hasPhoto?: boolean;
  mood?: string | null;
}

export interface ActivityUpdate {
  userId: string;
  kind: ActivityKind;
  sourceId: string;
  revision: number;
  deleted: boolean;
  facts: ActivityFacts | null;
}

export interface ChallengeActivity extends ActivityUpdate {
  walkId: string | null;
  occurredAt: Date | null;
  receivedAt: Date;
  qualifyingReceivedAt: Date | null;
}

function requireId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error("유효한 실적 식별자가 필요합니다.");
  }
}

function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error("시간대가 포함된 실적 시각이 필요합니다.");
  }
  const result = Date.parse(value);
  if (!Number.isFinite(result))
    throw new Error("실적 시각이 올바르지 않습니다.");
  return result;
}

export function validateActivity(update: ActivityUpdate, now: Date): void {
  requireId(update.userId);
  requireId(update.sourceId);
  if (
    update.userId.length > 26 ||
    !["WALK", "DIARY"].includes(update.kind) ||
    !Number.isSafeInteger(update.revision) ||
    update.revision < 1 ||
    update.revision > 2_147_483_647 ||
    typeof update.deleted !== "boolean"
  ) {
    throw new Error("실적 종류 또는 버전이 올바르지 않습니다.");
  }
  if (update.deleted) {
    if (update.facts !== null)
      throw new Error("삭제한 실적에는 원본 내용을 포함할 수 없습니다.");
    return;
  }
  const facts = update.facts;
  if (!facts) throw new Error("검증된 산책 기록이 필요합니다.");
  requireId(facts.walkId);
  const start = timestamp(facts.walkStartedAt);
  const end = timestamp(facts.walkEndedAt);
  if (
    start > end ||
    end > now.getTime() ||
    !Number.isFinite(facts.distanceMeters) ||
    facts.distanceMeters < 0
  ) {
    throw new Error("산책 시각 또는 이동 거리가 올바르지 않습니다.");
  }
  if (update.kind === "WALK") {
    if (
      facts.walkId !== update.sourceId ||
      typeof facts.completed !== "boolean"
    ) {
      throw new Error("산책 식별자와 완주 결과가 필요합니다.");
    }
    if (facts.routeId != null) requireId(facts.routeId);
    if (facts.routeAuthorId != null) requireId(facts.routeAuthorId);
    if (Boolean(facts.routeId) !== Boolean(facts.routeAuthorId)) {
      throw new Error("코스와 작성자 정보가 함께 필요합니다.");
    }
  } else {
    const saved = timestamp(facts.diarySavedAt);
    if (
      saved < end ||
      saved > now.getTime() ||
      typeof facts.hasPhoto !== "boolean" ||
      (facts.mood != null &&
        (typeof facts.mood !== "string" || facts.mood.length > 50))
    ) {
      throw new Error("일기 시각, 사진 또는 기분 정보가 올바르지 않습니다.");
    }
  }
}

/** Includes only facts that change credit eligibility, not presentation changes. */
export function qualificationKey(update: ActivityUpdate): string | null {
  const facts = update.facts;
  if (update.deleted || !facts || facts.distanceMeters <= 0) return null;
  const times = [
    new Date(facts.walkStartedAt).toISOString(),
    new Date(facts.walkEndedAt).toISOString(),
  ];
  if (update.kind === "WALK") {
    if (
      !facts.completed ||
      !facts.routeId ||
      !facts.routeAuthorId ||
      facts.routeAuthorId === update.userId
    )
      return null;
    return JSON.stringify([
      facts.walkId,
      ...times,
      facts.routeId,
      facts.routeAuthorId,
    ]);
  }
  if (
    !facts.hasPhoto ||
    !facts.mood?.trim() ||
    !facts.diarySavedAt ||
    koreaDate(facts.diarySavedAt) !== koreaDate(facts.walkEndedAt)
  )
    return null;
  return JSON.stringify([
    facts.walkId,
    ...times,
    new Date(facts.diarySavedAt).toISOString(),
  ]);
}
