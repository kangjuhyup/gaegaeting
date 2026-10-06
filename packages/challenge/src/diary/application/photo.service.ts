import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ulid } from "ulid";
import { ChallengeTransaction } from "../../shared/application/challenge-transaction.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { WalkRepository } from "../../walk/application/walk.repository.js";
import type { WalkingPhoto } from "../domain/walking-diary.js";
import { MAX_PHOTO_BYTES, sanitizePhoto } from "../domain/photo.js";
import { DiaryRepository } from "./diary.repository.js";
import { WalkingPhotoStorage } from "./walking-photo-storage.port.js";

@Injectable()
export class PhotoService {
  constructor(
    private readonly transaction: ChallengeTransaction,
    private readonly diaries: DiaryRepository,
    private readonly walks: WalkRepository,
    private readonly clock: ChallengeClock,
    private readonly storage: WalkingPhotoStorage,
  ) {}

  async begin(userId: string, walkId: string) {
    const photo = await this.transaction.run(userId, async () => {
      const walk = await this.walks.find(walkId);
      if (!walk || walk.userId !== userId || walk.state !== "FINISHED")
        throw new NotFoundException("종료한 내 산책이 필요합니다.");
      if ((await this.diaries.photos(userId, walkId)).length >= 4)
        throw new ConflictException(
          "산책당 사진은 최대 4장입니다. 사용하지 않는 업로드를 삭제해 주세요.",
        );
      const id = ulid();
      const value: WalkingPhoto = {
        id,
        userId,
        walkId,
        status: "UPLOADING",
        uploadKey: `walking/uploads/${id}.png`,
        objectKey: null,
        createdAt: this.clock.now(),
      };
      await this.diaries.savePhoto(value);
      return value;
    });
    try {
      return {
        id: photo.id,
        uploadUrl: await this.storage.uploadUrl(photo.uploadKey),
        expiresIn: 300,
        maxBytes: MAX_PHOTO_BYTES,
        maxDimension: 1600,
      };
    } catch (error) {
      await this.transaction.run(userId, async () => {
        await this.diaries.queueCleanup(
          photo.uploadKey,
          new Date(photo.createdAt.getTime() + 360_000),
        );
        await this.diaries.removePhoto(photo.id);
      });
      throw error;
    }
  }
  async complete(userId: string, id: string) {
    const photo = await this.diaries.photo(id);
    if (!photo || photo.userId !== userId)
      throw new NotFoundException("내 사진이 없습니다.");
    if (photo.status === "READY") return this.view(photo);
    if (this.clock.now().getTime() > photo.createdAt.getTime() + 3600_000)
      throw new ConflictException("만료된 사진 업로드입니다.");
    let bytes: Buffer;
    try {
      bytes = sanitizePhoto(
        await this.storage.read(photo.uploadKey, MAX_PHOTO_BYTES),
      );
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new BadRequestException(
        "5MiB 이하, 가로·세로 1600px 이하의 유효한 PNG 사진을 업로드해 주세요.",
      );
    }
    const objectKey = `walking/ready/${ulid()}.png`,
      reservedAt = this.clock.now();
    // Reserve durable cleanup before external I/O, including process crashes between upload and commit.
    await this.transaction.run(userId, async () => {
      const current = await this.diaries.photo(id);
      if (!current || current.userId !== userId)
        throw new NotFoundException("삭제한 사진입니다.");
      await this.diaries.queueCleanup(
        objectKey,
        new Date(reservedAt.getTime() + 3600_000),
      );
    });
    await this.storage.write(objectKey, bytes);
    const result = await this.transaction.run(userId, async () => {
      const current = await this.diaries.photo(id);
      if (!current || current.userId !== userId)
        throw new NotFoundException("삭제한 사진입니다.");
      if (current.status === "READY") return current;
      if (this.clock.now().getTime() > reservedAt.getTime() + 900_000)
        throw new ConflictException(
          "사진 처리 시간이 초과되었습니다. 다시 업로드해 주세요.",
        );
      const ready: WalkingPhoto = { ...current, status: "READY", objectKey };
      await this.diaries.savePhoto(ready);
      await this.diaries.cancelCleanup(objectKey);
      await this.diaries.queueCleanup(
        current.uploadKey,
        new Date(current.createdAt.getTime() + 360_000),
      );
      return ready;
    });
    return this.view(result);
  }
  async view(photo: WalkingPhoto) {
    return {
      id: photo.id,
      status: photo.status,
      url:
        photo.status === "READY" && photo.objectKey
          ? await this.storage.downloadUrl(photo.objectKey)
          : null,
      expiresIn: 300,
    };
  }
  async own(userId: string, walkId: string) {
    const walk = await this.walks.find(walkId);
    if (!walk || walk.userId !== userId || walk.state === "DELETED")
      throw new NotFoundException("내 산책이 없습니다.");
    return Promise.all(
      (await this.diaries.photos(userId, walkId)).map((photo) =>
        this.view(photo),
      ),
    );
  }
  /** Call only with photo IDs from an already-authorized diary projection. */
  async diaryPhotos(ids: string[]) {
    const photos = await Promise.all(ids.map((id) => this.diaries.photo(id)));
    return Promise.all(
      photos
        .filter((photo): photo is WalkingPhoto => photo?.status === "READY")
        .map((photo) => this.view(photo)),
    );
  }
}
