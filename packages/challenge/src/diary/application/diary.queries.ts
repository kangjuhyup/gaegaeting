import { Injectable, NotFoundException } from "@nestjs/common";
import { page } from "../../shared/application/content-validation.js";
import { WalkRepository } from "../../walk/application/walk.repository.js";
import { RouteRepository } from "../../route/application/route.repository.js";
import type { WalkingDiary } from "../domain/walking-diary.js";
import { DiaryRepository } from "./diary.repository.js";
import { PhotoService } from "./photo.service.js";

@Injectable()
export class DiaryQueries {
  constructor(
    private readonly diaries: DiaryRepository,
    private readonly walks: WalkRepository,
    private readonly routes: RouteRepository,
    private readonly photos: PhotoService,
  ) {}
  private async view(diary: WalkingDiary) {
    return {
      id: diary.id,
      authorName: diary.authorName,
      content: diary.content,
      mood: diary.mood,
      walkDate: diary.walkDate,
      photos: await this.photos.diaryPhotos(diary.photoIds),
    };
  }
  private async privateView(diary: WalkingDiary) {
    return {
      ...(await this.view(diary)),
      walkId: diary.walkId,
      routeId: diary.routeId,
      visibility: diary.visibility,
      revision: diary.revision,
      savedAt: diary.savedAt,
      updatedAt: diary.updatedAt,
    };
  }
  async own(userId: string, id: string) {
    const diary = await this.diaries.find(id);
    if (!diary || diary.userId !== userId)
      throw new NotFoundException("내 일기가 없습니다.");
    return this.privateView(diary);
  }
  async byWalk(userId: string, walkId: string) {
    const walk = await this.walks.find(walkId);
    if (!walk || walk.userId !== userId || walk.state === "DELETED")
      throw new NotFoundException("내 산책이 없습니다.");
    const diary = await this.diaries.byWalk(walkId);
    return diary ? this.privateView(diary) : null;
  }
  async ownList(userId: string, limit: number, offset: number) {
    page(limit, offset);
    return Promise.all(
      (await this.diaries.listOwn(userId, limit, offset)).map((diary) =>
        this.privateView(diary),
      ),
    );
  }
  async reviews(routeId: string, limit: number, offset: number) {
    page(limit, offset);
    if ((await this.routes.find(routeId))?.status !== "PUBLISHED")
      throw new NotFoundException("공개한 코스가 없습니다.");
    return Promise.all(
      (await this.diaries.publicReviews(routeId, limit, offset)).map((diary) =>
        this.view(diary),
      ),
    );
  }
}
