import type { ChallengeKind } from "../../../catalog/domain/challenge-definition.js";
import { Injectable } from "@nestjs/common";
import { ChallengeRepository } from "../../application/challenge.repository.js";
import type {
  ActivityKind,
  ChallengeActivity,
} from "../../../activity/domain/activity.js";
import type { ChallengeEnrollment } from "../../../participation/domain/challenge-enrollment.js";
import {
  ChallengeActivityEntity,
  ChallengeDeletedUserEntity,
  ChallengeEnrollmentEntity,
} from "./challenge.entities.js";
import { ChallengeSession } from "./challenge-session.js";

function enrollment(e: ChallengeEnrollmentEntity): ChallengeEnrollment {
  return {
    id: e.id,
    userId: e.userId,
    requestId: e.requestId,
    kind: e.kind,
    title: e.title,
    targetCount: e.targetCount,
    rewardCode: e.rewardCode,
    policyVersion: e.policyVersion,
    joinedAt: e.joinedAt,
    endsAt: e.endsAt,
    settlesAt: e.settlesAt,
    cancelledAt: e.cancelledAt ?? null,
    isCurrent: e.isCurrent,
  };
}

function activity(a: ChallengeActivityEntity): ChallengeActivity {
  return {
    userId: a.userId,
    kind: a.kind,
    sourceId: a.sourceId,
    revision: a.revision,
    deleted: a.deleted,
    facts: a.facts ?? null,
    walkId: a.walkId ?? null,
    occurredAt: a.occurredAt ?? null,
    receivedAt: a.receivedAt,
    qualifyingReceivedAt: a.qualifyingReceivedAt ?? null,
  };
}

@Injectable()
export class ChallengeOrmRepository extends ChallengeRepository {
  constructor(private readonly session: ChallengeSession) {
    super();
  }

  private get em() {
    return this.session.em;
  }

  async withUserLock<T>(
    userId: string,
    work: (repository: ChallengeRepository) => Promise<T>,
  ): Promise<T> {
    return this.session.run(userId, () => work(this));
  }

  async findByRequest(userId: string, requestId: string) {
    const row = await this.em.findOne(ChallengeEnrollmentEntity, {
      userId,
      requestId,
    });
    return row ? enrollment(row) : null;
  }

  async findCurrent(userId: string, kind: ChallengeKind) {
    const row = await this.em.findOne(ChallengeEnrollmentEntity, {
      userId,
      kind,
      isCurrent: true,
    });
    return row ? enrollment(row) : null;
  }

  async findEnrollment(userId: string, id: string) {
    const row = await this.em.findOne(ChallengeEnrollmentEntity, {
      userId,
      id,
    });
    return row ? enrollment(row) : null;
  }

  async listEnrollments(userId: string, limit: number) {
    const rows = await this.em.find(
      ChallengeEnrollmentEntity,
      { userId },
      { limit, orderBy: { joinedAt: "DESC", id: "DESC" } },
    );
    return rows.map(enrollment);
  }

  async saveEnrollment(value: ChallengeEnrollment) {
    await this.em.upsert(ChallengeEnrollmentEntity, value);
  }

  async findActivity(userId: string, kind: ActivityKind, sourceId: string) {
    const row = await this.em.findOne(ChallengeActivityEntity, {
      userId,
      kind,
      sourceId,
    });
    return row ? activity(row) : null;
  }

  async saveActivity(value: ChallengeActivity) {
    await this.em.upsert(ChallengeActivityEntity, value);
  }

  async listActivities(userId: string, start: Date, end: Date) {
    const rows = await this.em.find(ChallengeActivityEntity, {
      userId,
      occurredAt: { $gte: start, $lt: end },
    });
    const walkIds = [
      ...new Set(rows.flatMap((row) => (row.walkId ? [row.walkId] : []))),
    ];
    const deletedWalks = walkIds.length
      ? await this.em.find(ChallengeActivityEntity, {
          userId,
          kind: "WALK",
          sourceId: { $in: walkIds },
          deleted: true,
        })
      : [];
    return [...rows, ...deletedWalks].map(activity);
  }

  async deleteUserData(userId: string) {
    await this.em.nativeDelete(ChallengeEnrollmentEntity, { userId });
    await this.em.nativeDelete(ChallengeActivityEntity, { userId });
    await this.em.upsert(ChallengeDeletedUserEntity, { userId });
  }

  async isUserDeleted(userId: string) {
    return (await this.em.count(ChallengeDeletedUserEntity, { userId })) > 0;
  }
}
