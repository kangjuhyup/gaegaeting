import type { Provider } from "../../common/domain/store.js";

// An item defines the credit quantity; an offer defines how it is sold.
export interface Offer {
  id: string;
  productId: string;
  snackQuantity: number;
  basePriceKrw: number;
  priceKrw: number;
  provider: Provider;
  storeProductId: string;
  storeOfferId?: string;
  eventName?: string;
}
