import type { ChallengeKind } from "../../catalog/domain/challenge-definition.js";
import type {
  ActivityKind,
  ChallengeActivity,
} from "../../activity/domain/activity.js";
import type { ChallengeEnrollment } from "../../participation/domain/challenge-enrollment.js";

export abstract class ChallengeRepository {
  abstract withUserLock<T>(
    userId: string,
    work: (repository: ChallengeRepository) => Promise<T>,
  ): Promise<T>;
  abstract findByRequest(
    userId: string,
    requestId: string,
  ): Promise<ChallengeEnrollment | null>;
  abstract findCurrent(
    userId: string,
    kind: ChallengeKind,
  ): Promise<ChallengeEnrollment | null>;
  abstract findEnrollment(
    userId: string,
    id: string,
  ): Promise<ChallengeEnrollment | null>;
  abstract listEnrollments(
    userId: string,
    limit: number,
  ): Promise<ChallengeEnrollment[]>;
  abstract saveEnrollment(enrollment: ChallengeEnrollment): Promise<void>;
  abstract findActivity(
    userId: string,
    kind: ActivityKind,
    sourceId: string,
  ): Promise<ChallengeActivity | null>;
  abstract saveActivity(activity: ChallengeActivity): Promise<void>;
  abstract isUserDeleted(userId: string): Promise<boolean>;
  abstract listActivities(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<ChallengeActivity[]>;
  abstract deleteUserData(userId: string): Promise<void>;
}
