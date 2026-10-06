export interface WalkingDiary {
  id: string;
  userId: string;
  walkId: string;
  routeId: string | null;
  authorName: string;
  content: string;
  mood: string | null;
  photoIds: string[];
  visibility: "PRIVATE" | "PUBLIC";
  walkDate: string;
  revision: number;
  savedAt: Date;
  updatedAt: Date;
}
export interface WalkingPhoto {
  id: string;
  userId: string;
  walkId: string;
  status: "UPLOADING" | "READY";
  uploadKey: string;
  objectKey: string | null;
  createdAt: Date;
}
