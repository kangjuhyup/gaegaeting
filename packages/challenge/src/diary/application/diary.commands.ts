import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ulid } from "ulid";
import { ChallengeTransaction } from "../../shared/application/challenge-transaction.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { koreaDate } from "../../shared/domain/calendar.js";
import { textField } from "../../shared/application/content-validation.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";
import { ActivityCommands } from "../../activity/application/activity.commands.js";
import { WalkRepository } from "../../walk/application/walk.repository.js";
import { RouteRepository } from "../../route/application/route.repository.js";
import type { WalkingRecord } from "../../walk/domain/walking-record.js";
import type { WalkingDiary } from "../domain/walking-diary.js";
import { DiaryRepository } from "./diary.repository.js";

export interface DiaryDetails {
  content: string;
  mood: string | null;
  photoIds: string[];
  visibility: "PRIVATE" | "PUBLIC";
}

@Injectable()
export class DiaryCommands {
  constructor(
    private readonly transaction: ChallengeTransaction,
    private readonly diaries: DiaryRepository,
    private readonly walks: WalkRepository,
    private readonly routes: RouteRepository,
    private readonly challenges: ChallengeRepository,
    private readonly clock: ChallengeClock,
    private readonly activity: ActivityCommands,
  ) {}

  private async project(diary: WalkingDiary, walk: WalkingRecord) {
    await this.activity.recordActivity({
      userId: diary.userId,
      kind: "DIARY",
      sourceId: diary.id,
      revision: diary.revision,
      deleted: false,
      facts: {
        walkId: walk.id,
        walkStartedAt: walk.startedAt!.toISOString(),
        walkEndedAt: walk.endedAt!.toISOString(),
        distanceMeters: walk.distanceMeters,
        diarySavedAt: diary.savedAt.toISOString(),
        hasPhoto: diary.photoIds.length > 0,
        mood: diary.mood,
      },
    });
  }
  async save(
    userId: string,
    walkId: string,
    expectedRevision: number,
    input: DiaryDetails,
  ): Promise<string> {
    const content = textField(input.content, 5000, false);
    const mood =
      input.mood == null ? null : textField(input.mood, 50, false) || null;
    if (
      !Number.isInteger(expectedRevision) ||
      expectedRevision < 0 ||
      !["PRIVATE", "PUBLIC"].includes(input.visibility) ||
      !Array.isArray(input.photoIds) ||
      input.photoIds.length > 4 ||
      new Set(input.photoIds).size !== input.photoIds.length
    )
      throw new BadRequestException(
        "일기 버전·공개 범위·사진을 확인해 주세요.",
      );
    if (!content && !mood && !input.photoIds.length)
      throw new BadRequestException("본문, 기분 또는 사진을 남겨 주세요.");
    return this.transaction.run(userId, async () => {
      const walk = await this.walks.find(walkId);
      if (!walk || walk.userId !== userId || walk.state !== "FINISHED")
        throw new NotFoundException("종료한 내 산책이 필요합니다.");
      const previous = await this.diaries.byWalk(walkId);
      const same =
        previous &&
        previous.content === content &&
        previous.mood === mood &&
        previous.visibility === input.visibility &&
        JSON.stringify(previous.photoIds) === JSON.stringify(input.photoIds);
      if (same && previous.revision === expectedRevision + 1)
        return previous.id;
      if ((previous?.revision ?? 0) !== expectedRevision)
        throw new ConflictException(
          "일기가 변경되었습니다. 다시 조회해 주세요.",
        );
      for (const id of input.photoIds) {
        const photo = await this.diaries.photo(id);
        if (
          !photo ||
          photo.userId !== userId ||
          photo.walkId !== walkId ||
          photo.status !== "READY"
        )
          throw new BadRequestException(
            "이 산책에 업로드를 완료한 사진만 사용할 수 있습니다.",
          );
      }
      if (input.visibility === "PUBLIC") {
        const route = walk.routeId
          ? await this.routes.find(walk.routeId)
          : null;
        if (!walk.completed || route?.status !== "PUBLISHED")
          throw new BadRequestException(
            "공개 코스를 완주한 일기만 후기로 공개할 수 있습니다.",
          );
      }
      const now = this.clock.now(),
        id = previous?.id ?? ulid();
      if (input.visibility === "PUBLIC")
        await this.diaries.privatizeOtherReviews(userId, walk.routeId!, id);
      const diary: WalkingDiary = {
        id,
        userId,
        walkId,
        routeId: walk.routeId,
        authorName: walk.authorName,
        content,
        mood,
        photoIds: [...input.photoIds],
        visibility: input.visibility,
        walkDate: koreaDate(walk.endedAt!),
        revision: expectedRevision + 1,
        savedAt: previous?.savedAt ?? now,
        updatedAt: now,
      };
      await this.diaries.save(diary);
      await this.project(diary, walk);
      return id;
    });
  }
  private async erase(diary: WalkingDiary) {
    await this.diaries.remove(diary.id);
    await this.activity.recordActivity({
      userId: diary.userId,
      kind: "DIARY",
      sourceId: diary.id,
      revision: diary.revision + 1,
      deleted: true,
      facts: null,
    });
  }
  async remove(userId: string, id: string): Promise<void> {
    await this.transaction.run(userId, async () => {
      const diary = await this.diaries.find(id);
      if (!diary) {
        if ((await this.challenges.findActivity(userId, "DIARY", id))?.deleted)
          return;
        throw new NotFoundException("내 일기가 없습니다.");
      }
      if (diary.userId !== userId)
        throw new NotFoundException("내 일기가 없습니다.");
      await this.erase(diary);
      await this.diaries.removePhotos(userId, diary.walkId, this.clock.now());
    });
  }
  async removeForWalk(userId: string, walkId: string): Promise<void> {
    const diary = await this.diaries.byWalk(walkId);
    if (diary && diary.userId === userId) await this.erase(diary);
    await this.diaries.removePhotos(userId, walkId, this.clock.now());
  }
  async removePhoto(userId: string, id: string): Promise<void> {
    await this.transaction.run(userId, async () => {
      const photo = await this.diaries.photo(id);
      if (!photo || photo.userId !== userId)
        throw new NotFoundException("내 사진이 없습니다.");
      const diary = await this.diaries.byWalk(photo.walkId);
      if (diary?.photoIds.includes(id)) {
        const next = {
          ...diary,
          photoIds: diary.photoIds.filter((value) => value !== id),
          revision: diary.revision + 1,
          updatedAt: this.clock.now(),
        };
        await this.diaries.save(next);
        await this.project(next, (await this.walks.find(photo.walkId))!);
      }
      await this.diaries.queueCleanup(
        photo.uploadKey,
        new Date(
          Math.max(
            this.clock.now().getTime(),
            photo.createdAt.getTime() + 360_000,
          ),
        ),
      );
      if (photo.objectKey)
        await this.diaries.queueCleanup(photo.objectKey, this.clock.now());
      await this.diaries.removePhoto(id);
    });
  }
}
