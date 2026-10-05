import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "walking_route_bookmark" })
export class RouteBookmarkEntity {
  @PrimaryKey({ fieldName: "user_id", columnType: "varchar(26)" })
  userId!: string;
  @PrimaryKey({ fieldName: "route_id", columnType: "varchar(26)" })
  routeId!: string;
  @Property({ fieldName: "created_at", columnType: "timestamptz" })
  createdAt!: Date;
}
