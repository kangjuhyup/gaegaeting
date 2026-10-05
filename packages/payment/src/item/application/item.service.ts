import type { Provider } from "../../common/domain/store.js";
import { PaymentError } from "../../common/domain/payment-error.js";
import { ItemStore } from "./item-store.js";

export class ItemService {
  constructor(
    private readonly store: ItemStore,
    private readonly enabled: readonly Provider[],
  ) {}
  offers(provider: Provider) {
    if (!this.enabled.includes(provider))
      throw new PaymentError("STORE_UNAVAILABLE");
    return this.store.offers(provider);
  }
  async requireOffer(provider: Provider, offerId: string) {
    const offer = (await this.offers(provider)).find(
      (candidate) => candidate.id === offerId,
    );
    if (!offer) throw new PaymentError("OFFER_UNAVAILABLE");
    return offer;
  }
}
