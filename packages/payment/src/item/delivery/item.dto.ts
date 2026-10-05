import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { PaymentProvider } from "../../common/delivery/payment-provider.js";

@ObjectType()
export class SnackOffer {
  @Field(() => ID) id!: string;
  @Field() productId!: string;
  @Field(() => Int) snackQuantity!: number;
  @Field(() => Int) basePriceKrw!: number;
  @Field(() => Int) priceKrw!: number;
  @Field(() => PaymentProvider) provider!: PaymentProvider;
  @Field() storeProductId!: string;
  @Field({ nullable: true }) storeOfferId?: string;
  @Field({ nullable: true }) eventName?: string;
}
