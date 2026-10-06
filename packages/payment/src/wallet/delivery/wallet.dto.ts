import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SnackWallet {
  @Field(() => Int) balance!: number;
  @Field(() => Int) availableBalance!: number;
  @Field() frozen!: boolean;
}
