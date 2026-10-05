import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import type { WalkingRoute } from "../../domain/walking-route.js";
import type { Coordinate } from "../../../walk/domain/geometry.js";
@Entity({ tableName: "walking_route" })
export class WalkingRouteEntity implements WalkingRoute {
  @PrimaryKey({ fieldName: "id", columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "request_id", columnType: "uuid" }) requestId!: string;
  @Property({ fieldName: "source_walk_id", columnType: "varchar(26)" })
  sourceWalkId!: string;
  @Property({ fieldName: "title", columnType: "varchar(100)" }) title!: string;
  @Property({ fieldName: "description", columnType: "varchar(2000)" })
  description!: string;
  @Property({ fieldName: "start_place", columnType: "varchar(100)" })
  startPlace!: string;
  @Property({ fieldName: "end_place", columnType: "varchar(100)" })
  endPlace!: string;
  @Property({ fieldName: "author_name", columnType: "varchar(100)" })
  authorName!: string;
  @Property({ fieldName: "pet_names", columnType: "jsonb", type: "json" })
  petNames!: string[];
  @Property({ fieldName: "path", columnType: "jsonb", type: "json" })
  path!: Coordinate[];
  @Property({ fieldName: "tags", columnType: "jsonb", type: "json" })
  tags!: string[];
  @Property({ fieldName: "distance_meters", columnType: "integer" })
  distanceMeters!: number;
  @Property({ fieldName: "duration_seconds", columnType: "integer" })
  durationSeconds!: number;
  @Property({ fieldName: "is_loop", columnType: "boolean" }) isLoop!: boolean;
  @Property({ fieldName: "start_latitude", columnType: "double precision" })
  startLatitude!: number;
  @Property({ fieldName: "start_longitude", columnType: "double precision" })
  startLongitude!: number;
  @Property({ fieldName: "status", columnType: "varchar(16)" })
  status!: WalkingRoute["status"];
  @Property({
    fieldName: "review_reason",
    columnType: "varchar(500)",
    nullable: true,
  })
  reviewReason!: string | null;
  @Property({ fieldName: "revision", columnType: "integer" }) revision!: number;
  @Property({ fieldName: "created_at", columnType: "timestamptz" })
  createdAt!: Date;
  @Property({ fieldName: "updated_at", columnType: "timestamptz" })
  updatedAt!: Date;
}
