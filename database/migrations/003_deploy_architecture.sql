BEGIN;

ALTER TABLE account_state
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS save_version BIGINT NOT NULL DEFAULT 0 CHECK (save_version >= 0),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  CREATE TYPE item_rarity AS ENUM ('common','uncommon','rare','epic','legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id VARCHAR(96) NOT NULL,
  rarity item_rarity NOT NULL,
  enhance_level SMALLINT NOT NULL DEFAULT 0 CHECK (enhance_level BETWEEN 0 AND 10),
  equipped_slot VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS items_account_created_idx ON items(account_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS items_equipped_slot_unique_idx ON items(account_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

CREATE TABLE IF NOT EXISTS quests_daily (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL,
  quest_id VARCHAR(64) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target INTEGER NOT NULL CHECK (target > 0),
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, quest_date, quest_id)
);
CREATE INDEX IF NOT EXISTS quests_daily_account_date_idx ON quests_daily(account_id, quest_date DESC);

CREATE TABLE IF NOT EXISTS request_deduplication (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  idempotency_key UUID NOT NULL,
  route VARCHAR(96) NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS request_deduplication_created_idx ON request_deduplication(created_at);

CREATE TABLE IF NOT EXISTS application_logs (
  id BIGSERIAL PRIMARY KEY,
  severity VARCHAR(16) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS application_logs_created_idx ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS application_logs_event_created_idx ON application_logs(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS achievements (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  achievement_id VARCHAR(96) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(account_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS jobs_account_unlocked_idx ON jobs(account_id, unlocked, job_id);
CREATE INDEX IF NOT EXISTS skills_unlocked_account_idx ON skills_unlocked(account_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS accounts_status_login_idx ON accounts(status, last_login_at DESC);

COMMIT;
