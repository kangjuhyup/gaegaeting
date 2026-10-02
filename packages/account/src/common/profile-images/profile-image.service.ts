import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StorageService } from '@core/storage';
import { UserProfileRepositoryPort } from '../../user/infrastructure/port/user-profile-repository.port.js';
import { PetProfileRepositoryPort } from '../../pet/infrastructure/port/pet-profile-repository.port.js';
import { ProfileImageRepositoryPort, type ImageKind, type ProfileImageRecord } from './profile-image-repository.port.js';
import { PresignedUrl } from '../vo/presigned-url.js';

export const USER_IMAGE_STORAGE = 'USER_IMAGE_STORAGE';
export const PET_IMAGE_STORAGE = 'PET_IMAGE_STORAGE';
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_IMAGES = 6;
export type ProfileImageView = ProfileImageRecord & { url?: string };

@Injectable()
export class ProfileImageService {
  constructor(
    private readonly images: ProfileImageRepositoryPort,
    private readonly users: UserProfileRepositoryPort,
    private readonly pets: PetProfileRepositoryPort,
    @Inject(USER_IMAGE_STORAGE) private readonly userStorage: StorageService,
    @Inject(PET_IMAGE_STORAGE) private readonly petStorage: StorageService,
  ) {}
  private storage(kind: ImageKind): StorageService { return kind === 'USER' ? this.userStorage : this.petStorage; }
  private key(image: ProfileImageRecord): string { return image.uploadKey ? image.key : `${image.targetId}-${image.imageNo}`; }
  private slot(imageNo: number): void {
    if (!Number.isInteger(imageNo) || imageNo < 0 || imageNo >= MAX_PROFILE_IMAGES) throw new BadRequestException('사진은 최대 6장까지 등록할 수 있습니다.');
  }
  private target(kind: ImageKind, targetId: string): void {
    if (kind === 'PET' && (!/^[1-9]\d{0,9}$/.test(targetId) || Number(targetId) > 2147483647)) {
      throw new BadRequestException('잘못된 반려견 ID입니다.');
    }
  }
  private async owner(kind: ImageKind, targetId: string, userId: string): Promise<void> {
    this.target(kind, targetId);
    if (kind === 'USER') {
      if (targetId !== userId) throw new ForbiddenException('본인 사진만 관리할 수 있습니다.');
      if (!await this.users.selectUserProfileFromId(userId)) throw new NotFoundException('프로필을 먼저 등록해 주세요.');
    } else {
      const pet = await this.pets.selectPetFromId(Number(targetId));
      if (!pet || pet.userId !== userId) throw new ForbiddenException('본인의 반려견 사진만 관리할 수 있습니다.');
    }
  }
  private async required(kind: ImageKind, targetId: string, imageNo: number): Promise<ProfileImageRecord> {
    this.slot(imageNo);
    this.target(kind, targetId);
    const image = await this.images.find(kind, targetId, imageNo);
    if (!image) throw new NotFoundException('사진을 찾을 수 없습니다.');
    return image;
  }
  async begin(kind: ImageKind, targetId: string, imageNo: number, userId: string): Promise<PresignedUrl> {
    this.slot(imageNo);
    await this.owner(kind, targetId, userId);
    const key = `profile-images/uploads/${randomUUID()}.png`;
    const upload = await this.storage(kind).generateUploadPresignedUrl({ type: 'image', key, expires: 300 });
    await this.images.reserve(kind, targetId, imageNo, key);
    return PresignedUrl.from(upload, 300);
  }
  async complete(kind: ImageKind, targetId: string, imageNo: number, userId: string): Promise<ProfileImageView> {
    await this.owner(kind, targetId, userId);
    const image = await this.required(kind, targetId, imageNo);
    if (image.status === 'PENDING') return this.view(image);
    if (image.status !== 'UPLOADING') throw new ConflictException('업로드 중인 사진만 제출할 수 있습니다.');
    const storage = this.storage(kind);
    let header: { etag: string; bytes: Uint8Array };
    try { header = await storage.readImageHeader(this.key(image), MAX_PROFILE_IMAGE_BYTES); }
    catch { throw new BadRequestException('업로드한 사진을 확인할 수 없습니다. PNG 형식·5MB 이하 사진을 다시 올려 주세요.'); }
    const bytes = Buffer.from(header.bytes);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(png) || bytes.toString('ascii', 12, 16) !== 'IHDR' ||
        !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20) || bytes.readUInt32BE(16) > 4096 || bytes.readUInt32BE(20) > 4096) {
      throw new BadRequestException('지원하지 않는 사진입니다. 가로·세로 4096px 이하 사진을 선택해 주세요.');
    }
    // No PUT URL is ever issued for this key. The exact bytes seen by the admin stay immutable.
    const frozenKey = `profile-images/review/${randomUUID()}.png`;
    try { await storage.freezeImage(this.key(image), frozenKey, header.etag); }
    catch { throw new ConflictException('업로드 중 사진이 변경됐습니다. 다시 제출해 주세요.'); }
    const changed = await this.images.transition(image, 'PENDING', frozenKey);
    if (!changed) {
      await storage.deleteObject({ key: frozenKey });
      const current = await this.required(kind, targetId, imageNo);
      if (current.status === 'PENDING' && current.uploadKey === image.uploadKey) return this.view(current);
      throw new ConflictException('사진 상태가 변경되었습니다. 새로고침해 주세요.');
    }
    // Cleanup is best effort: the old PUT URL can only recreate an unreferenced staging object.
    await storage.deleteObject({ key: this.key(image) }).catch(() => undefined);
    return this.view(await this.required(kind, targetId, imageNo));
  }
  private async view(image: ProfileImageRecord): Promise<ProfileImageView> {
    if (image.status === 'UPLOADING' || image.status === 'REJECTED') return { ...image };
    try {
      const download = await this.storage(image.kind).generateDownloadPresignedUrl({ key: this.key(image), expires: 300 });
      return { ...image, url: download.presignedUrl };
    } catch { throw new ServiceUnavailableException('사진 조회를 잠시 사용할 수 없습니다.'); }
  }
  async own(kind: ImageKind, targetId: string, userId: string): Promise<ProfileImageView[]> {
    await this.owner(kind, targetId, userId);
    return Promise.all((await this.images.list(kind, targetId)).map(image => this.view(image)));
  }
  async pending(limit = 50): Promise<ProfileImageView[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('조회 수는 1~100 사이여야 합니다.');
    return Promise.all((await this.images.pending(limit)).map(image => this.view(image)));
  }
  async approvedUrls(kind: ImageKind, targetId: string): Promise<string[]> {
    const approved = (await this.images.list(kind, targetId)).filter(image => image.status === 'APPROVED' && image.active);
    return Promise.all(approved.map(async image => (await this.view(image)).url!));
  }
  async review(kind: ImageKind, targetId: string, imageNo: number, approve: boolean, reviewer: string): Promise<boolean> {
    const image = await this.required(kind, targetId, imageNo);
    if (image.status !== 'PENDING') throw new ConflictException('승인 대기 중인 사진만 검토할 수 있습니다.');
    if (approve) {
      try {
        const metadata = await this.storage(kind).getObjectMetadata({ key: this.key(image) });
        if (!metadata || metadata.ContentType !== 'image/png' || !metadata.ContentLength || metadata.ContentLength > MAX_PROFILE_IMAGE_BYTES) throw new Error('missing');
      } catch { throw new BadRequestException('사진 파일을 확인할 수 없습니다. 새로고침 후 다시 검토해 주세요.'); }
    }
    const changed = await this.images.transition(image, approve ? 'APPROVED' : 'REJECTED', image.key, reviewer);
    if (!changed) throw new ConflictException('다른 검토자가 이미 처리한 사진입니다. 새로고침해 주세요.');
    if (!approve) await this.storage(kind).deleteObject({ key: this.key(image) }).catch(() => undefined);
    return true;
  }
  async reviewUserByPath(userId: string, path: string, approve: boolean, reviewer: string): Promise<void> {
    const image = (await this.images.list('USER', userId)).find(image => image.key === path);
    if (!image) throw new NotFoundException('사진을 찾을 수 없습니다.');
    await this.review('USER', userId, image.imageNo, approve, reviewer);
  }
  async remove(kind: ImageKind, targetId: string, imageNo: number, userId: string): Promise<boolean> {
    await this.owner(kind, targetId, userId);
    const image = await this.required(kind, targetId, imageNo);
    if (!await this.images.remove(image)) throw new ConflictException('사진 상태가 변경되었습니다. 새로고침해 주세요.');
    await this.storage(kind).deleteObject({ key: this.key(image) }).catch(() => undefined);
    if (image.uploadKey && image.uploadKey !== image.key) await this.storage(kind).deleteObject({ key: image.uploadKey }).catch(() => undefined);
    return true;
  }
}
