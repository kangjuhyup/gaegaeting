import type { Provider } from "../../common/domain/store.js";
import type { Offer } from "../domain/item.js";

export abstract class ItemStore {
  abstract offers(provider: Provider): Promise<Offer[]>;
}
