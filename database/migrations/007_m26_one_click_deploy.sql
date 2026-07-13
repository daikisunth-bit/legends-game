BEGIN;

CREATE TABLE IF NOT EXISTS deployment_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  last_successful_bootstrap_at TIMESTAMPTZ,
  last_app_version VARCHAR(32),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO deployment_state(singleton)
VALUES(TRUE)
ON CONFLICT(singleton) DO NOTHING;

CREATE INDEX IF NOT EXISTS schema_migrations_applied_at_idx
  ON schema_migrations(applied_at DESC);

COMMIT;
