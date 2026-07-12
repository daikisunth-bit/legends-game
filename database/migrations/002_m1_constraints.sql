BEGIN;
ALTER TABLE account_state ADD CONSTRAINT account_state_current_job_known CHECK (
  current_job_id IS NULL OR current_job_id IN ('swordman','mage','archer','healer','magic_knight','paladin','dragoon','spell_archer','sage','bard')
);
CREATE INDEX jobs_account_unlocked_idx ON jobs(account_id, unlocked, tier);
COMMIT;
