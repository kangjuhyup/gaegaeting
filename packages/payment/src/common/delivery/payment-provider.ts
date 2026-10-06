import { registerEnumType } from "@nestjs/graphql";

export enum PaymentProvider {
  APPLE = "APPLE",
  GOOGLE = "GOOGLE",
}
registerEnumType(PaymentProvider, { name: "PaymentProvider" });
