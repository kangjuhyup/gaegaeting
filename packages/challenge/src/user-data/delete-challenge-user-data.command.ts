import { Injectable } from "@nestjs/common";
import { ChallengeRepository } from "../shared/application/challenge.repository.js";
import { ChallengeClock } from "../shared/application/challenge-clock.js";
import { DiaryRepository } from "../diary/application/diary.repository.js";
import { WalkRepository } from "../walk/application/walk.repository.js";
import { RouteRepository } from "../route/application/route.repository.js";

/** Source data, projection and durable media cleanup change in one user transaction. */
@Injectable()
export class DeleteChallengeUserDataCommand {
  constructor(
    private readonly repository: ChallengeRepository,
    private readonly diaries: DiaryRepository,
    private readonly walks: WalkRepository,
    private readonly routes: RouteRepository,
    private readonly clock: ChallengeClock,
  ) {}
  async execute(userId: string): Promise<void> {
    await this.repository.withUserLock(userId, async (repository) => {
      await this.diaries.deleteForUser(userId, this.clock.now());
      await this.routes.deleteForUser(userId);
      await this.walks.deleteForUser(userId);
      await repository.deleteUserData(userId);
    });
  }
}
