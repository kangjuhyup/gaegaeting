import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import {
  qualificationKey,
  validateActivity,
  type ActivityUpdate,
  type ChallengeActivity,
} from "../domain/activity.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";

@Injectable()
export class ActivityCommands {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly clock: ChallengeClock,
  ) {}

  /** Called by trusted source commands or authenticated server-to-server delivery. */
  async recordActivity(update: ActivityUpdate): Promise<"APPLIED" | "IGNORED"> {
    try {
      validateActivity(update, this.clock.now());
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "잘못된 실적입니다.",
      );
    }
    return this.repository.withUserLock(update.userId, async (repository) => {
      if (await repository.isUserDeleted(update.userId)) return "IGNORED";
      const previous = await repository.findActivity(
        update.userId,
        update.kind,
        update.sourceId,
      );
      // Deletion is terminal; even a later replay cannot resurrect erased evidence.
      if (
        previous &&
        (previous.deleted || previous.revision >= update.revision)
      )
        return "IGNORED";
      if (
        previous?.facts &&
        update.facts &&
        previous.facts.walkId !== update.facts.walkId
      ) {
        throw new ConflictException("실적의 원본 산책은 변경할 수 없습니다.");
      }
      const now = this.clock.now();
      const key = qualificationKey(update);
      const facts = update.facts;
      const value: ChallengeActivity = {
        ...update,
        walkId:
          facts?.walkId ?? (update.kind === "WALK" ? update.sourceId : null),
        occurredAt: facts ? new Date(facts.walkEndedAt) : null,
        receivedAt: now,
        qualifyingReceivedAt: key
          ? previous && qualificationKey(previous) === key
            ? (previous.qualifyingReceivedAt ?? now)
            : now
          : null,
      };
      await repository.saveActivity(value);
      return "APPLIED";
    });
  }
}
