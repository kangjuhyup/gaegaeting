import type { WalkingDiary, WalkingPhoto } from "../domain/walking-diary.js";
export abstract class DiaryRepository {
  abstract byWalk(walkId: string): Promise<WalkingDiary | null>;
  abstract find(id: string): Promise<WalkingDiary | null>;
  abstract listOwn(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingDiary[]>;
  abstract publicReviews(
    routeId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingDiary[]>;
  abstract save(diary: WalkingDiary): Promise<void>;
  abstract privatizeOtherReviews(
    userId: string,
    routeId: string,
    exceptId: string,
  ): Promise<void>;
  abstract remove(id: string): Promise<void>;
  abstract photos(userId: string, walkId: string): Promise<WalkingPhoto[]>;
  abstract photo(id: string): Promise<WalkingPhoto | null>;
  abstract savePhoto(photo: WalkingPhoto): Promise<void>;
  abstract removePhotos(
    userId: string,
    walkId: string,
    now: Date,
  ): Promise<void>;
  abstract deleteForUser(userId: string, now: Date): Promise<void>;
  abstract queueCleanup(key: string, notBefore: Date): Promise<void>;
  abstract cleanupBatch(
    now: Date,
    limit: number,
  ): Promise<{ objectKey: string; attempts: number }[]>;
  abstract cancelCleanup(key: string): Promise<void>;
  abstract cleanupResult(
    key: string,
    success: boolean,
    now: Date,
  ): Promise<void>;
  abstract expiredUploads(now: Date): Promise<WalkingPhoto[]>;
  abstract removePhoto(id: string): Promise<void>;
}
