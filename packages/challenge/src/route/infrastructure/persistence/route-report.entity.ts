import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import type { RouteReport } from "../../domain/walking-route.js";
@Entity({ tableName: "walking_route_report" })
export class RouteReportEntity implements RouteReport {
  @PrimaryKey({ fieldName: "id", columnType: "varchar(26)" }) id!: string;
  @Property({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @Property({ fieldName: "route_id", columnType: "varchar(26)" })
  routeId!: string;
  @Property({ fieldName: "reason", columnType: "varchar(32)" }) reason!: string;
  @Property({ fieldName: "detail", columnType: "varchar(500)" })
  detail!: string;
  @Property({ fieldName: "resolved", columnType: "boolean" })
  resolved!: boolean;
  @Property({ fieldName: "created_at", columnType: "timestamptz" })
  createdAt!: Date;
}
