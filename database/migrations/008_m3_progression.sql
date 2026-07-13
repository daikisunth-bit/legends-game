BEGIN;

CREATE TABLE IF NOT EXISTS card_slots (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slot_no SMALLINT NOT NULL CHECK(slot_no BETWEEN 1 AND 6),
  card_id VARCHAR(96) NOT NULL,
  rarity card_rarity NOT NULL,
  PRIMARY KEY(account_id,slot_no),
  UNIQUE(account_id,card_id),
  FOREIGN KEY(account_id,card_id,rarity) REFERENCES cards(account_id,card_id,rarity) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS card_slots_account_idx ON card_slots(account_id,slot_no);

CREATE TABLE IF NOT EXISTS presets (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slot_no SMALLINT NOT NULL CHECK(slot_no BETWEEN 1 AND 5),
  name VARCHAR(32) NOT NULL,
  job_id VARCHAR(64) NOT NULL,
  equipment JSONB NOT NULL DEFAULT '{}'::jsonb,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id,slot_no)
);
CREATE INDEX IF NOT EXISTS presets_account_slot_idx ON presets(account_id,slot_no);

ALTER TABLE items
  ADD CONSTRAINT items_equipped_slot_valid CHECK (equipped_slot IS NULL OR equipped_slot IN ('weapon','helmet','armor','pants','shoes','gloves')) NOT VALID;
ALTER TABLE items VALIDATE CONSTRAINT items_equipped_slot_valid;

UPDATE cards SET slotted=FALSE WHERE slotted=TRUE;

COMMIT;
