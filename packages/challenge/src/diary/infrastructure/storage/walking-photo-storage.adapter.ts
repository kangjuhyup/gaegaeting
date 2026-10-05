import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "@core/storage";
import { WalkingPhotoStorage } from "../../application/walking-photo-storage.port.js";

@Injectable()
export class WalkingPhotoStorageAdapter extends WalkingPhotoStorage {
  private readonly storage: StorageService | null;
  constructor(config: ConfigService) {
    super();
    const region = config.get<string>("STORAGE_REGION"),
      host = config.get<string>("STORAGE_HOST"),
      bucket = config.get<string>("STORAGE_WALKING_BUCKET"),
      access = config.get<string>("STORAGE_ACCESS_KEY_ID"),
      secret = config.get<string>("STORAGE_SECRET_ACCESS_KEY");
    this.storage =
      region && host && bucket && access && secret
        ? new StorageService(region, host, bucket, access, secret)
        : null;
  }
  private configured() {
    if (!this.storage)
      throw new ServiceUnavailableException(
        "산책 사진 저장소가 설정되지 않았습니다.",
      );
    return this.storage;
  }
  async uploadUrl(key: string) {
    return (
      await this.configured().generateUploadPresignedUrl({
        key,
        type: "image",
        expires: 300,
      })
    ).presignedUrl;
  }
  async downloadUrl(key: string) {
    return (
      await this.configured().generateDownloadPresignedUrl({
        key,
        expires: 300,
      })
    ).presignedUrl;
  }
  async read(key: string, maxBytes: number) {
    return this.configured().readImageSnapshot(key, maxBytes);
  }
  async write(key: string, bytes: Uint8Array) {
    await this.configured().writeImageSnapshot(key, bytes);
  }
  async delete(key: string) {
    await this.configured().deleteObject({ key });
  }
}
