import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "walking_media_cleanup" })
export class MediaCleanupEntity {
  @PrimaryKey({ fieldName: "object_key", columnType: "varchar(300)" })
  objectKey!: string;
  @Property({ fieldName: "not_before", columnType: "timestamptz" })
  notBefore!: Date;
  @Property({ fieldName: "attempts", columnType: "integer" }) attempts!: number;
}
