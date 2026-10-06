import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ulid } from "ulid";
import type { ChallengeKind } from "../../catalog/domain/challenge-definition.js";
import { ChallengeCatalogQueries } from "../../catalog/application/challenge-catalog.queries.js";
import { DAY_MS } from "../../shared/domain/calendar.js";
import { challengeEndsAt } from "../domain/challenge-enrollment.js";
import { progressFor } from "../domain/challenge-progress.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";

@Injectable()
export class ParticipationCommands {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly clock: ChallengeClock,
    private readonly catalog: ChallengeCatalogQueries,
  ) {}

  async join(
    userId: string,
    kind: ChallengeKind,
    requestId: string,
  ): Promise<string> {
    const definition = this.catalog.definition(kind);
    if (!definition)
      throw new BadRequestException("참여할 수 없는 챌린지입니다.");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId,
      )
    ) {
      throw new BadRequestException("참여 요청 식별자가 올바르지 않습니다.");
    }
    return this.repository.withUserLock(userId, async (repository) => {
      const now = this.clock.now();
      if (await repository.isUserDeleted(userId))
        throw new ConflictException("탈퇴한 계정으로 참여할 수 없습니다.");
      const previous = await repository.findByRequest(userId, requestId);
      if (previous) {
        if (previous.kind !== kind)
          throw new ConflictException("다른 챌린지에 사용한 참여 요청입니다.");
        return previous.id;
      }
      const current = await repository.findCurrent(userId, kind);
      if (current && current.settlesAt > now) {
        throw new ConflictException("이미 참여 중인 챌린지입니다.");
      }
      if (current)
        await repository.saveEnrollment({ ...current, isCurrent: false });
      const endsAt = challengeEndsAt(now, definition.durationDays);
      const id = ulid();
      await repository.saveEnrollment({
        id,
        userId,
        requestId,
        kind,
        title: definition.title,
        targetCount: definition.targetCount,
        rewardCode: definition.rewardCode,
        policyVersion: definition.policyVersion,
        joinedAt: now,
        endsAt,
        settlesAt: new Date(endsAt.getTime() + DAY_MS),
        cancelledAt: null,
        isCurrent: true,
      });
      return id;
    });
  }

  async cancel(userId: string, id: string): Promise<void> {
    await this.repository.withUserLock(userId, async (repository) => {
      const item = await repository.findEnrollment(userId, id);
      if (!item) throw new NotFoundException("챌린지 참여 기록이 없습니다.");
      if (item.cancelledAt) return;
      const now = this.clock.now();
      const activities = await repository.listActivities(
        userId,
        item.joinedAt,
        item.endsAt,
      );
      const progress = progressFor(item, activities, now);
      if (progress.status === "COMPLETED" || progress.status === "EXPIRED") {
        throw new ConflictException("이미 종료된 챌린지는 취소할 수 없습니다.");
      }
      await repository.saveEnrollment({
        ...item,
        cancelledAt: now,
        isCurrent: false,
      });
    });
  }
}
