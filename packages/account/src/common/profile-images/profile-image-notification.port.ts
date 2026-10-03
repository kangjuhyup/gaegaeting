import type { ImageKind } from "./profile-image-repository.port.js";

export interface ProfileImageSubmission {
  kind: ImageKind;
  targetId: string;
  imageNo: number;
  userId: string;
}

export abstract class ProfileImageNotificationPort {
  abstract notifySubmitted(submission: ProfileImageSubmission): Promise<void>;
}
