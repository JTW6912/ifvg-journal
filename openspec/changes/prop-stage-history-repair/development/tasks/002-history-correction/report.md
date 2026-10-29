# Task Report: 002-history-correction

Status: implemented; included in the user-authorized `prop-test` source delivery described in `../../git-delivery.md`. Formal task reviews and native acceptance/handoff remain pending. Specification baseline: 78305af.

## Implementation

11k separates immutable draft/diff/validation from narrow conditional UPDATE and explicit reload. Only bought_on/events/updated_at are written, guarded by id/owner/original version (including NULL), purchase date and JSON history. Exactly one validated returned row is required. Current identity/context/cache are rechecked after asynchronous completion. Reload also rejects a changed full cached row, preventing an older read from erasing newer non-history fields.

11l provides the approved horizontal capsules, explicit insertion positions, stage/date editing, tombstones/restore, before/after review, deletion acknowledgement, busy/keep/discard, error/conflict/uncertain-result reload, remaining-issue disclosure and keyboard containment. No render, search or draft mutation persists anything. Company logos reuse the existing safe public resolver.

Legacy historical-date controls now enter this review flow; dirty parent detail blocks entry and disables legacy date editing. Pending keyboard dates are preserved on entry. Clean parent detail is reconstructed from saved data. Normal explicit purchase-date edits still move the existing purchase/activation cash rows, but never infer a historical event from index zero; history repair itself never touches those cash rows. The classic detail entry layout is retained; its legacy date edits receive the same safety protection.

## Local evidence

Current delivery rerun: `../../evidence/delivery-command-results.json` binds all twelve product/test files to hashes; 212 tests, bundle, syntax, diff checks and the local rollback-only SQL contract passed. Earlier UI/plan artifacts referenced below are historical local evidence, not a fresh browser/matrix rerun or required contents of this source-only delivery.

Historical owner-confirmed D5 supplement: development/evidence/d5-verification.md and d5-command-results.json (212 whole-suite tests, 69 focused tests, native entry ok:true). Derived passes are report-only evidence and do not enter drafts/patches/persistence; D5 does not change this task's transport or controller. The previous SQL/browser/matrix records below were not rerun or relabelled as D5 evidence.

- Real-source tests: prop-history.test.js and prop-history-ui.test.js; red/green logs for initial implementation, in-place identity, pending date, index-zero, heading Tab, scope and reload-cache race in development/evidence.
- browser-first-save.json and browser-save-error-conflict-lifecycle.json: actual renderer/event controller with memory conditional transport, protected-field/cash invariance, errors/retry, explicit removal, uncertain result/reload, partial correction and late-response disposal.
- Native pointer/keyboard evidence: pending-date-native-entry.json, native-escape-dirty.json, native-date-keyboard.json, native-date-enter.json, native-heading-shifttab.json and native-mobile-tab.json. Date fill was unsupported by the wrapper in one earlier attempt; browser-date-input.json explicitly records DOM input/change for that step instead of claiming native typing.
- matrix-final-*.json: 448 theme/locale/viewport/view checks, including primary-button contrast. implementation-entry.png and implementation-history-editor.png are synthetic visual evidence.
- migrations/history-update-contract.sql and evidence/sql-contract.log: existing local PostgreSQL 16, temporary synthetic tables, narrow UPDATE/RETURNING, NULL/JSONB/owner predicates and unchanged protected fields/ledger; transaction rolled back.
- Independent source findings and fixes: evidence/source-review-findings.md, including final narrow recheck job_mvt2zbs5_6 for reload cache-race protection.

## Remaining gates / limitations

No formal approved spec/quality verdict or native task acceptance/handoff yet. This is not live Supabase, deployed RLS, PostgREST-network or production concurrency certification; SQL and fake transport limitations are explicit. The user authorized committing and pushing the current code, not a broader live business test. Personal record operations and connected-session artifacts are excluded from this public delivery. No dependency, production schema/RPC or privilege change is included. No final release or stage-complete claim is made.
