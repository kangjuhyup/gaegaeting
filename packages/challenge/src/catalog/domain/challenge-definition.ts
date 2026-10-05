export type ChallengeKind = "NEIGHBORHOOD_EXPLORER" | "WALK_DIARY";
export interface ChallengeDefinition {
  kind: ChallengeKind;
  title: string;
  description: string;
  durationDays: number;
  targetCount: number;
  rewardCode: string;
  policyVersion: number;
}

export const CHALLENGES: readonly Readonly<ChallengeDefinition>[] =
  Object.freeze([
    Object.freeze({
      kind: "NEIGHBORHOOD_EXPLORER" as const,
      title: "우리 동네 탐험대",
      description: "14일 동안 다른 보호자의 서로 다른 산책코스 3개를 완주해요.",
      durationDays: 14,
      targetCount: 3,
      rewardCode: "NEIGHBORHOOD_EXPLORER_BADGE",
      policyVersion: 1,
    }),
    Object.freeze({
      kind: "WALK_DIARY" as const,
      title: "우리 강아지 산책일기",
      description:
        "7일 동안 서로 다른 3일에 사진과 기분을 담은 산책일기를 남겨요.",
      durationDays: 7,
      targetCount: 3,
      rewardCode: "WALK_DIARY_CARD",
      policyVersion: 1,
    }),
  ]);
