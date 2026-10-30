# Glass / Prop compatibility — local verification

## Status and scope
Historical local verification before the authorized delivery. Git base at verification: `9228f59`; later connected synchronization and commit/push authorization are recorded separately in `git-delivery.md`. Existing uncommitted ranking-only behavior is a dependency, not attributed to this fix. Native requirements/prototype/development-entry checks passed for the documented compatibility extension; this is **not** a formal verification, task-acceptance or release receipt.

Eight production files replace 27 structural `currentLayout() ===/!== "modern"` checks with `isModernLayout()`; the nearby catalog comment also names Glass. A baseline-relative comparison verifies these are the only production edits since this fix began. Financial models, data transports, authentication, theme identity helpers, history context, CSS and translations are unchanged. See `evidence/glass-source-delta.json` and `evidence/glass-implementation.diff`.

## TDD / commands
- Pre-edit synthetic hashes cover overview, catalog, firm detail, account list and account details for both modern/classic and zh/en. No expected baseline was recaptured after implementation.
- Initial regression: 13 cases, 2 pass and 11 expected failures demonstrating Glass fallback/inactive interactions.
- Final regression: 15 cases pass, including added actual history-drawer context invalidation and memory-only appearance roundtrip.
- Full suite: 352 tests pass, no failures/skips/cancellations.
- Bundle (38 source files), app/i18n syntax and diff format checks pass. Reproducible command outputs are recorded in `evidence/glass-command-results.json`.

## Browser evidence (synthetic, offline only)
Harness: `dev/prop-catalog-check/`, entry `?demo=glass`, excludes real config and init, uses memory storage, blocks network/business methods and serves whitelisted local assets only. Public preview currently `http://127.0.0.1:46155/?demo=glass` (read server.json if restarted).

- `glass-browser-date.json`: native clicks select 2026-10-01 through 2026-10-20, picker closes, trigger receives focus and net is 15000 cents.
- `glass-browser-switch-chart-sort.json`: native layout select modern→Glass retains range/net; native line toggle draws two series; company sort works.
- `glass-browser-help-list.json`: native hover/escape, tooltip description/viewport checks, and funded stage list count.
- `glass-browser-history.json` / `glass-browser-return-accounts-catalog.json`: existing 640px history drawer is active, no overflow; back to account and list restores focus; exact funded-status navigation and eight-card catalog work.
- `glass-browser-catalog-detail.json` / `glass-browser-admin.json`: eighth-company detail retains modern content, purchase/comparison controls and back; administrator action uses the standalone modern editor, review protection and clean return, with no saves.
- Matrices at 1440, 390 and 320px each check 112 cases across seven palettes, two themes, two locales, modern/Glass and overview/catalog. All 336 cases report no problems, unchanged synthetic caches, no blocked business calls and no external resources. The exact checker is retained in `glass-matrix-checker.json`.
- Desktop catalog/overview and 390px overview screenshots were inspected. Final page has no console messages or JavaScript errors. Screenshots contain only synthetic data.

## Independent source follow-up
Read-only scout `job_mvv5cxug_1` checked the baseline-relative diff, source/helper semantics and regression tests. It identified no confirmed implementation defect or remaining exact modern-only structural comparison in its source search; it did not issue formal approval or execute tests. Controller rechecked cited helper and context code. Its two test-coverage gaps were supplemented; date-selector interaction evidence is separately browser-based.

## Limitations and recovery
Browser checks use Chromium viewport emulation, not physical mobile devices or cross-engine certification. Initial offline service was stopped and was restarted on a new loopback port. An initial catalog-button CSS locator was wrong; refreshed live refs located the eighth-company button and the subsequent detail/back assertions passed. No production change was made to accommodate either harness issue. Earlier raw failed attempts are not cited as passing evidence.

During this offline verification phase, no connected-site refresh, real account read/write, new Git commit, push or formal acceptance update occurred. Later owner requests authorized local-resource synchronization and test-branch delivery only. Frozen A1–A4 identities and all original baseline tasks are preserved; task 1.4 remains open.
