import { Injectable } from "@nestjs/common";
import { ChallengeSession } from "../../../shared/infrastructure/persistence/challenge-session.js";
import { DiaryRepository } from "../../application/diary.repository.js";
import type { WalkingDiary, WalkingPhoto } from "../../domain/walking-diary.js";
import { WalkingDiaryEntity } from "./walking-diary.entity.js";
import { WalkingPhotoEntity } from "./walking-photo.entity.js";
import { MediaCleanupEntity } from "./media-cleanup.entity.js";

@Injectable()
export class DiaryOrmRepository extends DiaryRepository {
  constructor(private readonly session: ChallengeSession) {
    super();
  }
  async byWalk(walkId: string): Promise<WalkingDiary | null> {
    const row = await this.session.em.findOne(WalkingDiaryEntity, { walkId });
    return row ? { ...row } : null;
  }
  async find(id: string): Promise<WalkingDiary | null> {
    const row = await this.session.em.findOne(WalkingDiaryEntity, { id });
    return row ? { ...row } : null;
  }
  async listOwn(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingDiary[]> {
    return (
      await this.session.em.find(
        WalkingDiaryEntity,
        { userId },
        { limit, offset, orderBy: { savedAt: "DESC", id: "DESC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async publicReviews(
    routeId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingDiary[]> {
    return (
      await this.session.em.find(
        WalkingDiaryEntity,
        { routeId, visibility: "PUBLIC" },
        { limit, offset, orderBy: { updatedAt: "DESC", id: "DESC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async save(value: WalkingDiary) {
    await this.session.em.upsert(WalkingDiaryEntity, value);
  }
  async privatizeOtherReviews(
    userId: string,
    routeId: string,
    exceptId: string,
  ) {
    await this.session.query(
      `UPDATE walking_diary SET visibility = 'PRIVATE', revision = revision + 1
      WHERE user_id = ? AND route_id = ? AND id <> ? AND visibility = 'PUBLIC'`,
      [userId, routeId, exceptId],
    );
  }
  async remove(id: string) {
    await this.session.em.nativeDelete(WalkingDiaryEntity, { id });
  }
  async photos(userId: string, walkId: string): Promise<WalkingPhoto[]> {
    return (
      await this.session.em.find(
        WalkingPhotoEntity,
        { userId, walkId },
        { orderBy: { createdAt: "ASC", id: "ASC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async photo(id: string): Promise<WalkingPhoto | null> {
    const row = await this.session.em.findOne(WalkingPhotoEntity, { id });
    return row ? { ...row } : null;
  }
  async savePhoto(value: WalkingPhoto) {
    await this.session.em.upsert(WalkingPhotoEntity, value);
  }
  private async queuePhoto(photo: WalkingPhoto, now: Date) {
    // A still-valid upload URL may recreate staging data; remove it after its validity window.
    await this.queueCleanup(
      photo.uploadKey,
      new Date(Math.max(now.getTime(), photo.createdAt.getTime() + 6 * 60_000)),
    );
    if (photo.objectKey) await this.queueCleanup(photo.objectKey, now);
  }
  async removePhotos(userId: string, walkId: string, now: Date) {
    for (const photo of await this.photos(userId, walkId))
      await this.queuePhoto(photo, now);
    await this.session.em.nativeDelete(WalkingPhotoEntity, { userId, walkId });
  }
  async deleteForUser(userId: string, now: Date) {
    for (const photo of await this.session.em.find(WalkingPhotoEntity, {
      userId,
    }))
      await this.queuePhoto(photo, now);
    await this.session.em.nativeDelete(WalkingPhotoEntity, { userId });
    await this.session.em.nativeDelete(WalkingDiaryEntity, { userId });
  }
  async queueCleanup(objectKey: string, notBefore: Date) {
    await this.session.query(
      `INSERT INTO walking_media_cleanup (object_key, not_before, attempts) VALUES (?, ?, 0)
      ON CONFLICT (object_key) DO UPDATE SET not_before = greatest(walking_media_cleanup.not_before, excluded.not_before)`,
      [objectKey, notBefore],
    );
  }
  async cleanupBatch(
    now: Date,
    limit: number,
  ): Promise<{ objectKey: string; attempts: number }[]> {
    return this.session.em.find(
      MediaCleanupEntity,
      { notBefore: { $lte: now } },
      { limit, orderBy: { notBefore: "ASC" } },
    );
  }
  async cancelCleanup(objectKey: string) {
    await this.session.em.nativeDelete(MediaCleanupEntity, { objectKey });
  }
  async cleanupResult(objectKey: string, success: boolean, now: Date) {
    if (success)
      await this.session.em.nativeDelete(MediaCleanupEntity, { objectKey });
    else
      await this.session.query(
        "UPDATE walking_media_cleanup SET attempts = attempts + 1, not_before = ? WHERE object_key = ?",
        [new Date(now.getTime() + 60_000), objectKey],
      );
  }
  async expiredUploads(now: Date): Promise<WalkingPhoto[]> {
    return this.session.em.find(
      WalkingPhotoEntity,
      {
        status: "UPLOADING",
        createdAt: { $lt: new Date(now.getTime() - 3600_000) },
      },
      { limit: 50 },
    );
  }
  async removePhoto(id: string) {
    await this.session.em.nativeDelete(WalkingPhotoEntity, { id });
  }
}
