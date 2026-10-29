# Offline database contract (not a deployment migration)

No production schema/permission/RPC change is needed. Because the new service uses conditional DML, this packet includes executable SQL verification rather than marking the SQL contract absent.

## Execution

`history-update-contract.sql` ran against the existing local PostgreSQL 16 main cluster using an explicit Unix socket `/var/run/postgresql`, port 5432, database `postgres`, operating-system account `postgres`, `psql -X -v ON_ERROR_STOP=1`. A minimal environment removed all inherited PG configuration. Input was supplied on stdin; no application tables, credentials or live Supabase connection were read. Initial local evidence: `development/evidence/sql-contract.log`, exit 0. The public delivery rerun is `development/evidence/delivery-sql-contract.log`, exit 0, with its command and source hashes recorded in `development/evidence/delivery-command-results.json`.

## Validation

Temporary synthetic tables verify narrow UPDATE/RETURNING, owner/id predicates, stale version/JSON history mismatches, JSONB object-key normalization and array order, nullable version IS NULL and unchanged protected fields/cash rows. The frontend transport tests separately verify request construction, payload, response validation and current-session checks.

This is not proof of deployed RLS, PostgREST URL encoding, real-network races, or live database schema. Those limits remain explicit; no real-ledger tests were executed.

## Rollback

The script wraps all DDL/DML in BEGIN/ROLLBACK and uses TEMP tables ON COMMIT DROP. Exit on error closes the session and rolls back; no persistent table/role/schema/migration is created. Do not run this through the project's live Supabase CLI or deployment process.
