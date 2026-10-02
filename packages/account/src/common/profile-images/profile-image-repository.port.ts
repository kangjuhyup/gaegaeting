export type ImageKind = 'USER' | 'PET';
export type ImageReviewStatus = 'UPLOADING' | 'PENDING' | 'APPROVED' | 'REJECTED';
export interface ProfileImageRecord {
  kind: ImageKind;
  targetId: string;
  imageNo: number;
  key: string;
  uploadKey?: string;
  status: ImageReviewStatus;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: string;
}

export abstract class ProfileImageRepositoryPort {
  abstract find(kind: ImageKind, targetId: string, imageNo: number): Promise<ProfileImageRecord | null>;
  abstract list(kind: ImageKind, targetId: string): Promise<ProfileImageRecord[]>;
  abstract pending(limit: number): Promise<ProfileImageRecord[]>;
  abstract reserve(kind: ImageKind, targetId: string, imageNo: number, key: string): Promise<void>;
  abstract transition(image: ProfileImageRecord, status: ImageReviewStatus, key: string, reviewer?: string): Promise<boolean>;
  abstract remove(image: ProfileImageRecord): Promise<boolean>;
}
