import { Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { WalletService } from "../application/wallet.service.js";
import { SnackWallet } from "./wallet.dto.js";
import { publicResult } from "../../common/delivery/result.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class WalletResolver {
  constructor(private readonly wallets: WalletService) {}
  @Query(() => SnackWallet)
  @Scopes("payment:read")
  mySnackWallet(@UserParam() user: UserPrincipal) {
    return publicResult(() => this.wallets.wallet(user.userId));
  }
}
