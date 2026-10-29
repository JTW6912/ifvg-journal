# D6 Git delivery — company logos in funnel account lists

## Authorization and destination

After requesting the connected local preview, the owner confirmed “可以推送吧”. This authorizes committing this narrow D6 presentation update and pushing `prop-test` normally. It does not authorize a master merge, force push, database operation, formal acceptance verdict or archive. The existing Vercel integration may build a test-branch preview.

The inspected local HEAD and remote `prop-test` were both `13f4eed5b5b3ea33cf4cfcf6954530d53bb30af2`. The implementation checkpoint is the commit containing this file. Only a normal fast-forward update from that baseline is intended.

## Delivered scope

- One avatar interpolation in `src/11h-prop-linkage.js`: reuse `propHistoryLogo(a)` instead of the generic funded-account glyph.
- Existing local company-logo resolution, safe letter/error fallback and 38px styling are reused without modification.
- Four synthetic regression tests in `test/prop-linkage-logos.test.js`: local logos/fallbacks/escaping; four stages and both partitions of each conversion edge; unchanged company rendering/data; actual registered image-error handler.
- D6 requirements/scope clarification and selected textual validation records.

Company-summary placeholders, public assets, name matching, main-funnel symbols, financial/transition calculations, row actions, current account status and ledger behavior are unchanged. No new dependency, schema or permissions change.

## Verification tied to this delivery

`evidence/d6-command-results.json` binds the product and test SHA-256 hashes and fresh pre-commit checks:

- Full suite: **216 passed / 216 total / 0 failed**.
- Bundle, app/i18n syntax and diff-format checks: exit 0.
- Generated bundle equals the resource copy displayed in the owner's connected local preview; source/test hashes match the previously validated version.

The earlier isolated actual-source browser checks covered 84 palette/theme/language/viewport cases, real image decode-error fallback, logo click/detail/back focus, conversion-tab navigation and keyboard activation. These historical checks are summarized in `evidence/d6-verification.md`; this delivery does not claim they were rerun against live data. Real account rows and browser/session artifacts are not published. No business-writing test was run in the connected application.

## Public commit boundary

Only the named source/test files, the D6 requirement and test-scope additions, and this clarification/validation packet belong to the commit. Excluded: configuration or keys, generated app bundle, screenshots, detailed browser logs, real account/ledger data, local dev harnesses, unrelated prior-change modifications, local-only development scaffolding and unfinished verification drafts. Public company names and local image paths in the tests are synthetic display fixtures, not hardcoded changes to real accounts.

## Formal workflow status

This is authorized test-branch Git synchronization, not completion of formal SpecNav verification, release or archive. Native standard development entry was `ok:true`; formal spec/quality verdicts and acceptance/handoff remain pending. Frozen assertions, historical review verdicts and task checkboxes are not marked passing by this delivery. The previously recorded verification-runtime limitation and unrelated diagnostic follow-ups are not bypassed or fixed by D6.
