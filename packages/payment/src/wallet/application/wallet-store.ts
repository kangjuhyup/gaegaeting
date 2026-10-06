import type { Wallet } from "../domain/wallet.js";

export abstract class WalletStore {
  abstract wallet(userId: string): Promise<Wallet>;
  // Trusted application capability, never an arbitrary public debit endpoint.
  abstract spend(
    userId: string,
    quantity: number,
    reference: string,
  ): Promise<Wallet>;
}
