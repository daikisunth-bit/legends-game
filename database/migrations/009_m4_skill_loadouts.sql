CREATE TABLE IF NOT EXISTS job_skill_loadouts (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  priority_skills JSONB NOT NULL DEFAULT '[null,null,null,null]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, job_id),
  CONSTRAINT job_skill_loadouts_four_slots CHECK (jsonb_array_length(priority_skills) = 4)
);
CREATE INDEX IF NOT EXISTS idx_job_skill_loadouts_account ON job_skill_loadouts(account_id);
