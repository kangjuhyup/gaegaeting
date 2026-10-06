import type { SqlMigration } from "@core/database";

export const paymentMigration: SqlMigration = {
  timestamp: 1791158400000,
  name: "Payment1791158400000",
  expectedTables: [
    "payment_product",
    "payment_store_product",
    "payment_offer",
    "payment_identity",
    "payment_intent",
    "payment_wallet",
    "payment_purchase",
    "payment_lot",
    "payment_ledger",
    "payment_spend_allocation",
    "payment_refund_tombstone",
    "payment_job",
    "payment_reconciliation",
  ],
  statements: [
    {
      text: `
CREATE TABLE payment_product (
 id text PRIMARY KEY, snack_quantity integer NOT NULL CHECK (snack_quantity > 0),
 base_price_krw integer NOT NULL CHECK (base_price_krw > 0)
);
CREATE TABLE payment_store_product (
 provider text NOT NULL CHECK (provider IN ('APPLE','GOOGLE')), store_product_id text NOT NULL,
 product_id text NOT NULL REFERENCES payment_product(id), PRIMARY KEY(provider,store_product_id), UNIQUE(provider,store_product_id,product_id)
);
CREATE TABLE payment_offer (
 id text PRIMARY KEY, product_id text NOT NULL REFERENCES payment_product(id),
 provider text NOT NULL CHECK (provider IN ('APPLE','GOOGLE')), store_product_id text NOT NULL,
 store_offer_id text, price_krw integer NOT NULL CHECK (price_krw > 0), event_name text,
 starts_at timestamptz, ends_at timestamptz, enabled boolean NOT NULL DEFAULT true,
 FOREIGN KEY(provider,store_product_id,product_id) REFERENCES payment_store_product(provider,store_product_id,product_id),
 CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE FUNCTION payment_keep_mapping() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'payment_product' THEN
  IF NEW.snack_quantity <> OLD.snack_quantity THEN RAISE EXCEPTION 'Payment quantity is immutable'; END IF;
 ELSE
  IF NEW.product_id <> OLD.product_id OR NEW.provider <> OLD.provider OR NEW.store_product_id <> OLD.store_product_id
   OR (TG_TABLE_NAME = 'payment_offer' AND to_jsonb(NEW)->'store_offer_id' IS DISTINCT FROM to_jsonb(OLD)->'store_offer_id') THEN RAISE EXCEPTION 'Payment store mapping is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_product_mapping BEFORE UPDATE ON payment_product FOR EACH ROW EXECUTE FUNCTION payment_keep_mapping();
CREATE TRIGGER payment_store_product_mapping BEFORE UPDATE ON payment_store_product FOR EACH ROW EXECUTE FUNCTION payment_keep_mapping();
CREATE TRIGGER payment_offer_mapping BEFORE UPDATE ON payment_offer FOR EACH ROW EXECUTE FUNCTION payment_keep_mapping();
CREATE TABLE payment_identity (user_id text PRIMARY KEY, account_token uuid NOT NULL UNIQUE);
CREATE TABLE payment_intent (
 id char(26) PRIMARY KEY, user_id text NOT NULL REFERENCES payment_identity(user_id),
 provider text NOT NULL CHECK (provider IN ('APPLE','GOOGLE')), environment text NOT NULL,
 account_token uuid NOT NULL, offer jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_intent_recovery ON payment_intent(account_token,provider,created_at DESC);
CREATE TABLE payment_wallet (user_id text PRIMARY KEY, balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0), frozen boolean NOT NULL DEFAULT false);
CREATE TABLE payment_purchase (
 id char(26) PRIMARY KEY, intent_id char(26) NOT NULL REFERENCES payment_intent(id), user_id text NOT NULL REFERENCES payment_wallet(user_id),
 provider text NOT NULL CHECK (provider IN ('APPLE','GOOGLE')), environment text NOT NULL,
 transaction_id text NOT NULL, account_token uuid NOT NULL, store_product_id text NOT NULL, store_offer_id text,
 state text NOT NULL CHECK (state IN ('PURCHASED','REFUNDED')), snack_quantity integer NOT NULL CHECK (snack_quantity > 0),
 used_quantity integer NOT NULL DEFAULT 0 CHECK (used_quantity >= 0 AND used_quantity <= snack_quantity),
 price_krw integer NOT NULL CHECK (price_krw > 0), amount_minor bigint, currency text,
 refund_review boolean NOT NULL DEFAULT false, refund_revision integer NOT NULL DEFAULT 0 CHECK (refund_revision >= 0), purchased_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,environment,transaction_id)
);
CREATE INDEX payment_purchase_history ON payment_purchase(user_id,id DESC);
CREATE TABLE payment_lot (
 purchase_id char(26) PRIMARY KEY REFERENCES payment_purchase(id), user_id text NOT NULL REFERENCES payment_wallet(user_id),
 remaining integer NOT NULL CHECK (remaining >= 0), refund_reserved boolean NOT NULL DEFAULT false
);
CREATE INDEX payment_lot_fifo ON payment_lot(user_id,purchase_id);
CREATE TABLE payment_ledger (
 id char(26) PRIMARY KEY, user_id text NOT NULL REFERENCES payment_wallet(user_id),
 kind text NOT NULL CHECK (kind IN ('GRANT','SPEND','REFUND','RESTORE')), reference text NOT NULL, delta integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,reference)
);
CREATE TABLE payment_spend_allocation (
 ledger_id char(26) NOT NULL REFERENCES payment_ledger(id), purchase_id char(26) NOT NULL REFERENCES payment_purchase(id),
 quantity integer NOT NULL CHECK (quantity > 0), PRIMARY KEY(ledger_id,purchase_id)
);
CREATE TABLE payment_refund_tombstone (
 provider text NOT NULL, environment text NOT NULL, transaction_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(provider,environment,transaction_id)
);
CREATE TABLE payment_reconciliation (
 provider text PRIMARY KEY CHECK (provider IN ('APPLE','GOOGLE')), last_checked_at timestamptz NOT NULL
);
CREATE TABLE payment_job (
 id char(26) PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('FINALIZE','NOTIFICATION')),
 provider text NOT NULL CHECK (provider IN ('APPLE','GOOGLE')), dedupe_key text NOT NULL,
 encrypted_proof text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_token uuid, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, UNIQUE(provider,kind,dedupe_key)
);
CREATE INDEX payment_job_ready ON payment_job(next_attempt_at,lease_until);
INSERT INTO payment_product (id,snack_quantity,base_price_krw) VALUES ('snacks-10',10,2000),('snacks-50',50,6000),('snacks-100',100,10000);
INSERT INTO payment_store_product(provider,store_product_id,product_id)
SELECT provider,'app.gaegaeting.snacks.'||snack_quantity,id FROM payment_product CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) providers(provider);
INSERT INTO payment_offer (id,product_id,provider,store_product_id,price_krw)
SELECT lower(provider)||'-'||id,id,provider,'app.gaegaeting.snacks.'||snack_quantity,base_price_krw
FROM payment_product CROSS JOIN (VALUES ('APPLE'),('GOOGLE')) providers(provider);
`,
    },
  ],
};
