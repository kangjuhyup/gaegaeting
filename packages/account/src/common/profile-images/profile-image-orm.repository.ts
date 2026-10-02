import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, UserAttachmentOrmEntity, PetAttachmentOrmEntity } from '@core/database/mikro';
import { ProfileImageRepositoryPort, type ImageKind, type ImageReviewStatus, type ProfileImageRecord } from './profile-image-repository.port.js';

@Injectable()
export class ProfileImageOrmRepository extends ProfileImageRepositoryPort {
  constructor(private readonly em: EntityManager) { super(); }

  private entity(kind: ImageKind): typeof UserAttachmentOrmEntity | typeof PetAttachmentOrmEntity { return kind === 'USER' ? UserAttachmentOrmEntity : PetAttachmentOrmEntity; }
  private where(kind: ImageKind, targetId: string, imageNo?: number): any {
    return { [kind === 'USER' ? 'user' : 'pet']: kind === 'USER' ? targetId : Number(targetId), ...(imageNo === undefined ? {} : { no: imageNo }) };
  }
  private record(kind: ImageKind, row: any): ProfileImageRecord {
    return { kind, targetId: String(kind === 'USER' ? row.userId : row.petId), imageNo: row.no,
      key: row.path, uploadKey: row.uploadKey, status: row.reviewStatus, active: row.isActive,
      createdAt: row.createdAt, updatedAt: row.updatedAt, reviewedBy: row.reviewedBy };
  }
  async find(kind: ImageKind, targetId: string, imageNo: number): Promise<ProfileImageRecord | null> {
    const row = await this.em.findOne<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(kind), this.where(kind, targetId, imageNo), { refresh: true });
    return row ? this.record(kind, row) : null;
  }
  async list(kind: ImageKind, targetId: string): Promise<ProfileImageRecord[]> {
    const rows = await this.em.find<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(kind), this.where(kind, targetId), { orderBy: { no: 'asc' }, refresh: true });
    return rows.map(row => this.record(kind, row));
  }
  async pending(limit: number): Promise<ProfileImageRecord[]> {
    const result: ProfileImageRecord[] = [];
    for (const kind of ['USER', 'PET'] as const) {
      const rows = await this.em.find<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(kind), { reviewStatus: 'PENDING', isActive: false }, { orderBy: { updatedAt: 'asc' }, limit, refresh: true });
      result.push(...rows.map(row => this.record(kind, row)));
    }
    return result.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()).slice(0, limit);
  }
  async reserve(kind: ImageKind, targetId: string, imageNo: number, key: string): Promise<void> {
    const current = await this.find(kind, targetId, imageNo);
    const data = { path: key, uploadKey: key, reviewStatus: 'UPLOADING' as const, isActive: false, reviewedBy: null, reviewedAt: null, updatedAt: new Date() };
    if (current) {
      const expired = current.status === 'UPLOADING' && current.updatedAt.getTime() < Date.now() - 15 * 60_000;
      if (current.status !== 'REJECTED' && !expired) throw new ConflictException('이미 사용 중인 사진 슬롯입니다. 기존 사진을 삭제한 후 다시 올려 주세요.');
      const changed = await this.em.nativeUpdate<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(kind), { ...this.where(kind, targetId, imageNo), uploadKey: current.uploadKey ?? null, reviewStatus: current.status }, data);
      if (!changed) throw new ConflictException('사진 상태가 변경되었습니다. 새로고침해 주세요.');
      return;
    }
    try {
      await this.em.insert<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(kind), { ...this.where(kind, targetId, imageNo), ...data, createdAt: new Date() });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('이미 사용 중인 사진 슬롯입니다.');
      throw error;
    }
  }
  async transition(image: ProfileImageRecord, status: ImageReviewStatus, key: string, reviewer?: string): Promise<boolean> {
    const changed = await this.em.nativeUpdate<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(image.kind), {
      ...this.where(image.kind, image.targetId, image.imageNo), reviewStatus: image.status, uploadKey: image.uploadKey ?? null,
    }, { reviewStatus: status, path: key, isActive: status === 'APPROVED', updatedAt: new Date(),
      ...(reviewer ? { reviewedBy: reviewer, reviewedAt: new Date() } : {}) });
    return changed === 1;
  }
  async remove(image: ProfileImageRecord): Promise<boolean> {
    return (await this.em.nativeDelete<UserAttachmentOrmEntity | PetAttachmentOrmEntity>(this.entity(image.kind), { ...this.where(image.kind, image.targetId, image.imageNo), uploadKey: image.uploadKey ?? null, reviewStatus: image.status })) === 1;
  }
}
