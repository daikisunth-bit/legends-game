BEGIN;

CREATE TABLE IF NOT EXISTS service_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  maintenance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message VARCHAR(240),
  registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_state(singleton)
VALUES(TRUE)
ON CONFLICT(singleton) DO NOTHING;

CREATE INDEX IF NOT EXISTS battles_retention_idx
  ON battles(created_at, kind);

CREATE INDEX IF NOT EXISTS application_logs_retention_idx
  ON application_logs(created_at, severity);

COMMIT;
