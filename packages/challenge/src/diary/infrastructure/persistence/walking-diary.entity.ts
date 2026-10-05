import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import type { WalkingDiary } from "../../domain/walking-diary.js";
@Entity({ tableName: "walking_diary" })
export class WalkingDiaryEntity implements WalkingDiary {
  @PrimaryKey({ fieldName: "id", columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "walk_id", columnType: "varchar(26)" })
  walkId!: string;
  @Property({
    fieldName: "route_id",
    columnType: "varchar(26)",
    nullable: true,
  })
  routeId!: string | null;
  @Property({ fieldName: "author_name", columnType: "varchar(100)" })
  authorName!: string;
  @Property({ fieldName: "content", columnType: "varchar(5000)" })
  content!: string;
  @Property({ fieldName: "mood", columnType: "varchar(50)", nullable: true })
  mood!: string | null;
  @Property({ fieldName: "photo_ids", columnType: "jsonb", type: "json" })
  photoIds!: string[];
  @Property({ fieldName: "visibility", columnType: "varchar(8)" })
  visibility!: WalkingDiary["visibility"];
  @Property({ fieldName: "walk_date", columnType: "varchar(10)" })
  walkDate!: string;
  @Property({ fieldName: "revision", columnType: "integer" }) revision!: number;
  @Property({ fieldName: "saved_at", columnType: "timestamptz" })
  savedAt!: Date;
  @Property({ fieldName: "updated_at", columnType: "timestamptz" })
  updatedAt!: Date;
}
