import { registerEnumType } from "@nestjs/graphql";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}

registerEnumType(UserStatus, { name: "UserStatus" });
