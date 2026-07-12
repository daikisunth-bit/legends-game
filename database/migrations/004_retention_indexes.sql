BEGIN;
CREATE INDEX IF NOT EXISTS battles_kind_created_idx ON battles(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_ref_idx ON transactions(ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS request_deduplication_account_route_idx ON request_deduplication(account_id, route, created_at DESC);
COMMIT;
