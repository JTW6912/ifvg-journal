# Task Report: 001-history-inspection

Status: implemented; included in the user-authorized `prop-test` source delivery described in `../../git-delivery.md`. Formal task reviews and native acceptance/handoff remain pending. Specification baseline: 78305afd99d8dd5211d1aa22e7cff843564fd152.

## Implementation

- 11k owns pure per-account diagnosis, stable history snapshots and pending/all search. Current company/group scope consumes full cached history, independently of financial dates.
- 11l provides the scoped drawer, public-logo resolver/fallback, explicit missing/suspect/external/blocked reasons, empty/search/read-only states and context/focus guards.
- 11h replaces only the modern funnel's full-width history notice with the approved heading entry and pending-account count. Existing finance guards, linkage-list notice and cash formulas remain. The owner-confirmed D5 clarification updates pass evidence and same-day diagnostic semantics, not financial calculations.
- 11d preserves malformed-root evidence without exposing it to persistence; normal unrelated saves/renewals retain raw roots. Null historical members no longer crash legacy funnel readers.

## Local evidence

Current delivery rerun: `../../evidence/delivery-command-results.json` binds all twelve product/test files to hashes; 212 tests, bundle, syntax, diff checks and the local rollback-only SQL contract passed. Earlier UI/plan artifacts referenced below are historical local evidence, not a fresh matrix rerun or required contents of this source-only delivery.

Historical D5 supplement: development/evidence/d5-verification.md and d5-command-results.json (212 whole-suite tests, 69 focused tests, native entry ok:true). The statistical funded-date fallback does not create stored events; same-day reset/retry is no longer a duplicate hint. Earlier evidence below remains historical, not a D5 rerun.

See development/evidence/command-results.json and tests-final.log (pre-D5 whole-suite result), matrix-final-1440/768/375/320.json (448 viewport/theme/locale/view combinations), browser-scope-search-readonly-mobile.json, native-mobile-tab.json and entry-final.json. All records and amounts are synthetic. Opening, searching, switching tabs and inspecting were zero-request operations; forbidden writers/network remained unused.

Independent read-only scouts job_mvsy9lxo_2, job_mvt0t8se_3, job_mvt0tqil_4 and job_mvt28281_5 supplied factual source findings. Main agent checked citations and fixed issues; details are in development/evidence/source-review-findings.md. These are not formal approved verdicts.

## Remaining gates / limitations

Formal spec/quality reports and native acceptance/handoff still pending; tasks remain unchecked. Local Chromium viewport checks do not certify physical devices or all assistive technology. Screenshots, connected-session records and personal data are excluded from the public delivery. The validation described here is offline/synthetic and does not certify deployed RLS or live concurrency. This Git delivery performs no database write or schema migration; it is not a formal release approval.
