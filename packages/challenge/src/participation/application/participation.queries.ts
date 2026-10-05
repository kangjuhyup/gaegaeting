import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { progressFor } from "../domain/challenge-progress.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";

@Injectable()
export class ParticipationQueries {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly clock: ChallengeClock,
  ) {}

  async enrollment(userId: string, id: string) {
    const item = await this.repository.findEnrollment(userId, id);
    if (!item) throw new NotFoundException("챌린지 참여 기록이 없습니다.");
    const activities = await this.repository.listActivities(
      userId,
      item.joinedAt,
      item.endsAt,
    );
    return progressFor(item, activities, this.clock.now());
  }

  async enrollments(userId: string, limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException("조회 개수는 1~50입니다.");
    const items = await this.repository.listEnrollments(userId, limit);
    if (!items.length) return [];
    const start = new Date(
      Math.min(...items.map((item) => item.joinedAt.getTime())),
    );
    const end = new Date(
      Math.max(...items.map((item) => item.endsAt.getTime())),
    );
    const activities = await this.repository.listActivities(userId, start, end);
    const now = this.clock.now();
    return items.map((item) => progressFor(item, activities, now));
  }
}
