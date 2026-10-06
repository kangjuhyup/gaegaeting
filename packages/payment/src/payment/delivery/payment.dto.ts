import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { PaymentProvider } from "../../common/delivery/payment-provider.js";
import { SnackOffer } from "../../item/delivery/item.dto.js";
export { PaymentProvider } from "../../common/delivery/payment-provider.js";

@ObjectType()
export class SnackPurchasePreparation {
  @Field(() => ID) id!: string;
  @Field(() => PaymentProvider) provider!: PaymentProvider;
  @Field() accountToken!: string;
  @Field(() => SnackOffer) offer!: SnackOffer;
}
@ObjectType()
export class SnackPurchaseConfirmation {
  @Field(() => ID) id!: string;
  @Field() state!: string;
  @Field(() => Int) snackQuantity!: number;
}
@ObjectType()
export class SnackTransaction {
  @Field(() => ID) id!: string;
  @Field(() => PaymentProvider) provider!: PaymentProvider;
  @Field() state!: string;
  @Field(() => Int) snackQuantity!: number;
  @Field(() => Int) priceKrw!: number;
  @Field({ nullable: true }) amountMinor?: number;
  @Field({ nullable: true }) currency?: string;
  @Field() refundReview!: boolean;
}
@InputType()
export class PrepareSnackPurchaseInput {
  @Field(() => PaymentProvider)
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
  @Field(() => ID) @IsString() @IsNotEmpty() @MaxLength(100) offerId!: string;
}
@InputType()
export class ConfirmSnackPurchaseInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  preparedId!: string;
  @Field() @IsString() @IsNotEmpty() @MaxLength(65_536) proof!: string;
}
