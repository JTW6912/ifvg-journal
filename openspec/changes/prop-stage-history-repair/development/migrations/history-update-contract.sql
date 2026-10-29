-- OFFLINE ONLY. Synthetic temporary tables, no application schema, Auth/RLS or live Supabase.
-- Run with an explicit LOCAL Unix socket, database postgres, -X and ON_ERROR_STOP.
-- All changes roll back. This supplements JS query/transport tests; not a deployment migration.
BEGIN;
SET LOCAL statement_timeout = '10s';
CREATE TEMP TABLE ifvg_history_contract_accounts (
  id text PRIMARY KEY, user_id uuid NOT NULL, bought_on date NOT NULL,
  events jsonb NOT NULL, updated_at timestamptz,
  status text NOT NULL, renewing boolean NOT NULL, balance numeric,
  note text, renewed_through date
) ON COMMIT DROP;
CREATE TEMP TABLE ifvg_history_contract_entries (id text, account_id text, day date, amount numeric) ON COMMIT DROP;
INSERT INTO ifvg_history_contract_accounts VALUES
 ('synthetic-a','00000000-0000-4000-8000-000000000001','2026-10-01',
  '[{"to":"eval","day":"2026-10-01","extra":{"keep":true}},{"to":"funded","day":"2026-10-05"}]',
  '2026-10-20T00:00:00Z','funded',false,51000,'retain other fields','2026-10-01'),
 ('synthetic-null','00000000-0000-4000-8000-000000000001','2026-10-01','[]',NULL,'eval',true,NULL,'null version','2026-10-01');
INSERT INTO ifvg_history_contract_entries VALUES ('synthetic-cash','synthetic-a','2026-10-01',100);
DO $$
DECLARE n integer; old_fields jsonb; old_cash jsonb; result_row ifvg_history_contract_accounts%ROWTYPE;
BEGIN
 SELECT to_jsonb(a) - ARRAY['events','bought_on','updated_at'] INTO old_fields FROM ifvg_history_contract_accounts a WHERE id='synthetic-a';
 SELECT jsonb_agg(to_jsonb(e)) INTO old_cash FROM ifvg_history_contract_entries e;
 UPDATE ifvg_history_contract_accounts SET bought_on='2026-09-30',
   events='[{"to":"passed","day":"2026-10-03"},{"to":"funded","day":"2026-10-05"}]', updated_at='2026-10-29T00:00:00.123Z'
 WHERE id='synthetic-a' AND user_id='00000000-0000-4000-8000-000000000001'
   AND updated_at='2026-10-20T00:00:00Z' AND bought_on='2026-10-01'
   -- JSONB equality ignores object key order, but preserves array order/contents.
   AND events='[{"extra":{"keep":true},"day":"2026-10-01","to":"eval"},{"day":"2026-10-05","to":"funded"}]'::jsonb
 RETURNING * INTO result_row;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 OR result_row.bought_on<>'2026-09-30' OR result_row.events->0->>'to'<>'passed'
   OR result_row.updated_at<>'2026-10-29T00:00:00.123Z'::timestamptz THEN RAISE EXCEPTION 'conditional update/returning failed'; END IF;
 IF to_jsonb(result_row)-ARRAY['events','bought_on','updated_at'] IS DISTINCT FROM old_fields THEN RAISE EXCEPTION 'protected account fields changed'; END IF;
 IF (SELECT jsonb_agg(to_jsonb(e)) FROM ifvg_history_contract_entries e) IS DISTINCT FROM old_cash THEN RAISE EXCEPTION 'ledger changed'; END IF;
 UPDATE ifvg_history_contract_accounts SET bought_on='2026-10-02'
 WHERE id='synthetic-a' AND user_id='00000000-0000-4000-8000-000000000001'
 AND updated_at='2026-10-20T00:00:00Z' AND bought_on='2026-10-01';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'stale version matched'; END IF;
 UPDATE ifvg_history_contract_accounts SET events='[]'
 WHERE id='synthetic-a' AND user_id='00000000-0000-4000-8000-000000000002';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'foreign owner predicate matched'; END IF;
 UPDATE ifvg_history_contract_accounts SET events='[]'
 WHERE id='synthetic-a' AND user_id='00000000-0000-4000-8000-000000000001'
 AND updated_at='2026-10-29T00:00:00.123Z' AND bought_on='2026-09-30'
 AND events='[{"to":"funded","day":"2026-10-05"},{"to":"passed","day":"2026-10-03"}]';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'reordered original array matched'; END IF;
 UPDATE ifvg_history_contract_accounts SET events='[]'
 WHERE id='synthetic-a' AND user_id='00000000-0000-4000-8000-000000000001'
 AND updated_at='2026-10-29T00:00:00.123Z' AND bought_on='2026-09-30'
 AND events='[{"to":"passed","day":"2026-10-04"},{"to":"funded","day":"2026-10-05"}]';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'different original history matched'; END IF;
 UPDATE ifvg_history_contract_accounts SET bought_on='2026-09-30',events='[{"to":"eval","day":"2026-09-30"}]',updated_at='2026-10-29T00:00:00.124Z'
 WHERE id='synthetic-null' AND user_id='00000000-0000-4000-8000-000000000001'
 AND updated_at IS NULL AND bought_on='2026-10-01' AND events='[]'
 RETURNING * INTO result_row;
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 OR result_row.updated_at IS NULL THEN RAISE EXCEPTION 'nullable version guard failed'; END IF;
 -- Actual bought_on is NOT NULL: JS additionally defends a malformed snapshot with IS NULL.
 RAISE NOTICE 'PASS: local predicates/JSONB/NULL/RETURNING/protected fields/ledger invariance';
END $$;
ROLLBACK;
