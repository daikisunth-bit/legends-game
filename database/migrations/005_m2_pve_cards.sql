BEGIN;
DO $$ BEGIN CREATE TYPE card_rarity AS ENUM ('common','uncommon','rare','epic','legendary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS cards (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  card_id VARCHAR(96) NOT NULL,
  rarity card_rarity NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0 CHECK(qty >= 0),
  slotted BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY(account_id,card_id,rarity)
);
CREATE INDEX IF NOT EXISTS cards_account_idx ON cards(account_id,card_id);
CREATE INDEX IF NOT EXISTS battles_unacknowledged_idx ON battles(account_id,acknowledged,created_at DESC);
COMMIT;
