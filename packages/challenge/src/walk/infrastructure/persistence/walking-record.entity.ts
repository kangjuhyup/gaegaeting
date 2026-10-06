import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import type {
  WalkingPet,
  RouteSnapshot,
  WalkSegment,
  WalkingRecord,
} from "../../domain/walking-record.js";
import type { TrackPoint } from "../../domain/geometry.js";
@Entity({ tableName: "walking_record" })
export class WalkingRecordEntity implements WalkingRecord {
  @PrimaryKey({ fieldName: "id", columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "request_id", columnType: "uuid" }) requestId!: string;
  @Property({ fieldName: "state", columnType: "varchar(16)" })
  state!: WalkingRecord["state"];
  @Property({ fieldName: "author_name", columnType: "varchar(100)" })
  authorName!: string;
  @Property({ fieldName: "pets", columnType: "jsonb", type: "json" })
  pets!: WalkingPet[];
  @Property({
    fieldName: "route_id",
    columnType: "varchar(26)",
    nullable: true,
  })
  routeId!: string | null;
  @Property({
    fieldName: "route",
    columnType: "jsonb",
    type: "json",
    nullable: true,
  })
  route!: RouteSnapshot | null;
  @Property({ fieldName: "points", columnType: "jsonb", type: "json" })
  points!: TrackPoint[];
  @Property({ fieldName: "segments", columnType: "jsonb", type: "json" })
  segments!: WalkSegment[];
  @Property({
    fieldName: "started_at",
    columnType: "timestamptz",
    nullable: true,
  })
  startedAt!: Date | null;
  @Property({
    fieldName: "ended_at",
    columnType: "timestamptz",
    nullable: true,
  })
  endedAt!: Date | null;
  @Property({
    fieldName: "finished_at",
    columnType: "timestamptz",
    nullable: true,
  })
  finishedAt!: Date | null;
  @Property({ fieldName: "distance_meters", columnType: "integer" })
  distanceMeters!: number;
  @Property({ fieldName: "coverage", columnType: "double precision" })
  coverage!: number;
  @Property({ fieldName: "completed", columnType: "boolean" })
  completed!: boolean;
  @Property({ fieldName: "revision", columnType: "integer" }) revision!: number;
  @Property({ fieldName: "policy_version", columnType: "integer" })
  policyVersion!: number;
}
