import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import type { WalkingPhoto } from "../../domain/walking-diary.js";
@Entity({ tableName: "walking_photo" })
export class WalkingPhotoEntity implements WalkingPhoto {
  @PrimaryKey({ fieldName: "id", columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "walk_id", columnType: "varchar(26)" })
  walkId!: string;
  @Property({ fieldName: "status", columnType: "varchar(12)" })
  status!: WalkingPhoto["status"];
  @Property({ fieldName: "upload_key", columnType: "varchar(300)" })
  uploadKey!: string;
  @Property({
    fieldName: "object_key",
    columnType: "varchar(300)",
    nullable: true,
  })
  objectKey!: string | null;
  @Property({ fieldName: "created_at", columnType: "timestamptz" })
  createdAt!: Date;
}
