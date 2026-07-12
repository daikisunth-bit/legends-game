-- Static game data stays in versioned JSON/TypeScript, not PostgreSQL.
-- This seed creates daily quests for existing accounts without overwriting progress.
INSERT INTO quests_daily(account_id, quest_date, quest_id, progress, target, claimed)
SELECT id, CURRENT_DATE, 'hunters_duty', 0, 30, FALSE FROM accounts
ON CONFLICT DO NOTHING;
INSERT INTO quests_daily(account_id, quest_date, quest_id, progress, target, claimed)
SELECT id, CURRENT_DATE, 'elite_challenge', 0, 1, FALSE FROM accounts
ON CONFLICT DO NOTHING;
INSERT INTO quests_daily(account_id, quest_date, quest_id, progress, target, claimed)
SELECT id, CURRENT_DATE, 'daily_login', 1, 1, FALSE FROM accounts
ON CONFLICT DO NOTHING;
