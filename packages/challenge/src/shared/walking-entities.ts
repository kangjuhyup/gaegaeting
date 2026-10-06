import { WalkingRecordEntity } from "../walk/infrastructure/persistence/walking-record.entity.js";
import { WalkingRouteEntity } from "../route/infrastructure/persistence/walking-route.entity.js";
import { WalkingDiaryEntity } from "../diary/infrastructure/persistence/walking-diary.entity.js";
import { WalkingPhotoEntity } from "../diary/infrastructure/persistence/walking-photo.entity.js";
import { RouteBookmarkEntity } from "../route/infrastructure/persistence/route-bookmark.entity.js";
import { RouteReportEntity } from "../route/infrastructure/persistence/route-report.entity.js";
import { MediaCleanupEntity } from "../diary/infrastructure/persistence/media-cleanup.entity.js";
export const WALKING_ENTITIES = [
  WalkingRecordEntity,
  WalkingRouteEntity,
  WalkingDiaryEntity,
  WalkingPhotoEntity,
  RouteBookmarkEntity,
  RouteReportEntity,
  MediaCleanupEntity,
];
