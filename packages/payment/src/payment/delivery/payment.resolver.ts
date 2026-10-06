import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { GraphQLError } from "graphql";
import { PaymentService } from "../application/payment.service.js";
import { publicResult as result } from "../../common/delivery/result.js";
import {
  ConfirmSnackPurchaseInput,
  PrepareSnackPurchaseInput,
  SnackPurchaseConfirmation,
  SnackPurchasePreparation,
  SnackTransaction,
} from "./payment.dto.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class PaymentResolver {
  constructor(private readonly payment: PaymentService) {}
  @Query(() => [SnackTransaction])
  @Scopes("payment:read")
  mySnackTransactions(
    @UserParam() user: UserPrincipal,
    @Args("after", { nullable: true, type: () => String }) after?: string,
  ) {
    if (after && !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(after))
      throw new GraphQLError("INVALID_CURSOR", {
        extensions: { code: "INVALID_CURSOR" },
      });
    return result(() => this.payment.purchases(user.userId, after));
  }
  @Mutation(() => SnackPurchasePreparation)
  @Scopes("payment:write")
  prepareSnackPurchase(
    @UserParam() user: UserPrincipal,
    @Args("input") input: PrepareSnackPurchaseInput,
  ) {
    return result(() =>
      this.payment.prepare(user.userId, input.provider, input.offerId),
    );
  }
  @Mutation(() => SnackPurchaseConfirmation)
  @Scopes("payment:write")
  confirmSnackPurchase(
    @UserParam() user: UserPrincipal,
    @Args("input") input: ConfirmSnackPurchaseInput,
  ) {
    return result(() =>
      this.payment.confirm(user.userId, input.preparedId, input.proof),
    );
  }
}
