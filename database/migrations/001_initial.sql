BEGIN;

CREATE TYPE account_status AS ENUM ('active', 'banned');
CREATE TYPE job_tier AS ENUM ('tier1', 'tier2', 'tier3');
CREATE TYPE currency_type AS ENUM ('gold', 'diamond', 'arena_coin', 'wb_medal');
CREATE TYPE transaction_source AS ENUM ('game', 'mock', 'gateway');

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  display_name VARCHAR(32) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE account_state (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  current_job_id VARCHAR(64),
  starter_job_selected BOOLEAN NOT NULL DEFAULT FALSE,
  gold BIGINT NOT NULL DEFAULT 0 CHECK (gold >= 0),
  diamond BIGINT NOT NULL DEFAULT 1000 CHECK (diamond >= 0),
  arena_coin BIGINT NOT NULL DEFAULT 0 CHECK (arena_coin >= 0),
  wb_medal BIGINT NOT NULL DEFAULT 0 CHECK (wb_medal >= 0),
  pvp_rating INTEGER NOT NULL DEFAULT 1000,
  inventory_cap INTEGER NOT NULL DEFAULT 100 CHECK (inventory_cap BETWEEN 100 AND 300),
  tutorial_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  map_unlocks JSONB NOT NULL DEFAULT '["map1"]'::jsonb,
  CONSTRAINT account_state_current_job_requires_selection
    CHECK ((starter_job_selected = FALSE AND current_job_id IS NULL)
        OR (starter_job_selected = TRUE AND current_job_id IS NOT NULL))
);

CREATE TABLE jobs (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  job_id VARCHAR(64) NOT NULL,
  tier job_tier NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 100),
  exp BIGINT NOT NULL DEFAULT 0 CHECK (exp >= 0),
  rebirth_count INTEGER NOT NULL DEFAULT 0 CHECK (rebirth_count BETWEEN 0 AND 10),
  stat_str INTEGER NOT NULL DEFAULT 0 CHECK (stat_str >= 0),
  stat_dex INTEGER NOT NULL DEFAULT 0 CHECK (stat_dex >= 0),
  stat_con INTEGER NOT NULL DEFAULT 0 CHECK (stat_con >= 0),
  stat_int INTEGER NOT NULL DEFAULT 0 CHECK (stat_int >= 0),
  unspent_points INTEGER NOT NULL DEFAULT 0 CHECK (unspent_points >= 0),
  mastery_milestones SMALLINT NOT NULL DEFAULT 0 CHECK (mastery_milestones BETWEEN 0 AND 15),
  PRIMARY KEY (account_id, job_id)
);

CREATE TABLE skills_unlocked (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  skill_id VARCHAR(96) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, skill_id)
);

CREATE TABLE battles (
  battle_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('pve', 'pvp', 'wb')),
  node_id VARCHAR(96),
  seed BIGINT NOT NULL,
  data_version VARCHAR(32) NOT NULL,
  result JSONB NOT NULL,
  total_damage BIGINT NOT NULL DEFAULT 0 CHECK (total_damage >= 0),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX battles_account_created_idx ON battles(account_id, created_at DESC);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  currency currency_type NOT NULL,
  delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  reason VARCHAR(64) NOT NULL,
  ref_id VARCHAR(128),
  source transaction_source NOT NULL DEFAULT 'game',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_account_created_idx ON transactions(account_id, created_at DESC);

COMMIT;
