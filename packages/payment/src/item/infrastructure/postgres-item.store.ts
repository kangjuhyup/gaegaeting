import type { Pool } from "pg";
import type { Provider } from "../../common/domain/store.js";
import { ItemStore } from "../application/item-store.js";
import type { Offer } from "../domain/item.js";

export class PostgresItemStore extends ItemStore {
  constructor(private readonly pool: Pool) {
    super();
  }
  async offers(provider: Provider): Promise<Offer[]> {
    return (
      await this.pool.query(
        `SELECT o.id,o.product_id "productId",p.snack_quantity "snackQuantity",p.base_price_krw "basePriceKrw",
      o.price_krw "priceKrw",o.provider,o.store_product_id "storeProductId",o.store_offer_id "storeOfferId",o.event_name "eventName"
      FROM payment_offer o JOIN payment_product p ON p.id=o.product_id
      WHERE o.provider=$1 AND o.enabled AND (o.starts_at IS NULL OR o.starts_at <= now()) AND (o.ends_at IS NULL OR o.ends_at > now())
      ORDER BY p.snack_quantity,o.price_krw,o.id`,
        [provider],
      )
    ).rows.map((r) => ({
      ...r,
      storeOfferId: r.storeOfferId ?? undefined,
      eventName: r.eventName ?? undefined,
    })) as Offer[];
  }
}
