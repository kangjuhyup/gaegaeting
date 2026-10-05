import { WalletStore } from "./wallet-store.js";

export class WalletService {
  constructor(private readonly store: WalletStore) {}
  wallet(userId: string) {
    return this.store.wallet(userId);
  }
  // Only another trusted application use case can spend; no GraphQL debit exists.
  spend(userId: string, quantity: number, reference: string) {
    return this.store.spend(userId, quantity, reference);
  }
}
