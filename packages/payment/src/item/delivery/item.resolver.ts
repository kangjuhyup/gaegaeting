import { Args, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphqlAccessGuard, Scopes } from "@core/auth";
import { ItemService } from "../application/item.service.js";
import { SnackOffer } from "./item.dto.js";
import { PaymentProvider } from "../../common/delivery/payment-provider.js";
import { publicResult } from "../../common/delivery/result.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ItemResolver {
  constructor(private readonly items: ItemService) {}
  @Query(() => [SnackOffer])
  @Scopes("payment:read")
  snackProducts(
    @Args("provider", { type: () => PaymentProvider })
    provider: PaymentProvider,
  ) {
    return publicResult(() => this.items.offers(provider));
  }
}
