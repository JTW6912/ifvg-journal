# Task Report: 001-monthly-cashflow

## Status

BLOCKED — native acceptance/handoff receipts remain outstanding, not implementation or human-review approval. Local implementation checks pass. The owner has explicitly confirmed “我觉得可以了，提交代码吧，人工已审核” and authorized the local implementation commit; the human-approved source hashes are in development/human-review.json. This report does not claim completed development handoff or Verification V2. Nothing is pushed.

## Files Changed

- src/03-state.js: ephemeral monthly overlay flag.
- src/11e-prop-view.js: modern-only monthly composition; existing grouping/detail seam retained.
- src/11g-prop-overview.js: narrow shared tooltip/lifecycle/key integration.
- src/11i-prop-months.js: new focused monthly presentation/overlay module.
- theme-modern.css: scoped monthly styles.
- i18n.js: four paired zh/en keys.
- test/prop-months.test.js: 16 synthetic regressions.

The ignored dev/prop-months-check harness and active-change records provide verification support. Financial source, global main renderer/events, classic CSS, palettes and dependencies have no diff. Exact approved source hashes: development/human-review.json and development/evidence/review-source-manifest.json. Extended diffs, screenshots and raw TDD logs remain local review material; they are not all included in the implementation commit.

## What Changed

Modern monthly view preserves original bars and financial helpers; adds an off-by-default two-line overlay, a safe field-level recovery explanation, uniform SVG icons and the left-adjacent date/amount toolbar. Toggle patches only its controls/overlay, preserving expanded native ledger groups. Real account detail and existing form handlers remain unchanged. Classic monthly HTML is byte-identical in both languages. Very long mobile amounts stack into full-width rows rather than breaking digits.

## TDD Evidence

- development/evidence/months-red.log: before implementation, classic baseline passed and nine new behavior tests failed as expected.
- development/evidence/long-amount-red.log: narrow-screen extreme-value layout regression before the focused presentation fix.
- development/evidence/tests-final.log: 149 tests, 149 pass, zero failures. Existing financial/overview/linkage tests were not edited.
- Scoped test and shared-seam review evidence: development/evidence/test-review.md and shared-seam-review.md.

## Verification Commands

Commit-time local executions recorded in development/evidence/commit-validation.json, all exit code 0:

1. node --test test/prop-months.test.js test/prop-overview.test.js test/prop-linkage.test.js
2. npm test
3. npm run bundle
4. node --check app.js
5. node --check i18n.js
6. git diff --check

These are actual host-tool executions against uncommitted source, not managed reviewed-HEAD attestations.

## Browser Evidence

All paths below are under development/evidence in this change:

- browser-default.json and overlay-geometry.json: default off, 12 bars, exactly two optional series, measured endpoint error zero and expanded group preserved.
- browser-toggle-help.json: native on/off, hover, Escape and aria association.
- browser-range-keyboard.json: year-boundary focus fallback, native arrow month action, partial range totals/line retention, exit cleanup and reload default.
- browser-form-compatibility.json: real detail, native draft input, exact input node preserved across redraw, cancel with no writes.
- theme-locale-matrix.json: per-case results; theme-matrix-final.json reruns all 224 combinations after the long-value fix across 375/640/768/1600, seven palettes, zh/en, light/dark and toggle modes. No document overflow/missing labels or amount changes. Custom colors apply to both series.
- browser-mobile-boundaries.json and long-amount-check.json: native Tab/click/Escape, 44px help target, tooltip bounds, refund/pending/empty and long amounts.
- browser-scope-lifecycle.json: native global date picker and company filter; no toggle storage writes; loading/disabled/logout detach resources. Logout clears the flag.
- implementation-default.png, implementation-lines.png, implementation-mobile.png, mobile-help-dark-en.png and mobile-large-final.png were visually inspected, not merely accepted as saved paths.

Harness: dev/prop-months-check. Current source is assembled without init/config; all accounts are synthetic; storage is memory-only, network/business writes are blocked and CSP forbids connections. offlineCalls stayed empty. The connected site and user login were untouched.

## Concerns

Read-only scouts job_mvr5l14c_8 (partial spec scope) and job_mvr5lice_9 (quality scope) did not identify a confirmed code defect. Main agent point-checked citations and added scope/early-return/storage evidence for their limitations. Their findings are not relabeled as formal approved verdicts; the later owner confirmation is separately recorded as the source of human approval. An early browser script exceeded the tool's 25-call limit; successful focused reruns supersede that orchestration failure. Browser reuse metadata is not evidence of fresh browser installation or physical-device/full assistive-technology certification. The default headed test browser showed SVG artifacts even in unchanged navigation; the same source rendered correctly headless and in a new isolated headed session using --disable-gpu. See development/evidence/headed-rendering-diagnostic.md and implementation-headed-software.png. No production or authenticated-session change was used to hide the graphics issue.

## Scope Deviations

None for this change. Seven source/test paths are within scope. Other changes' pre-existing worktree records were not modified. After the offline checks, the owner explicitly requested the connected local page for manual review. The assistant synchronized public frontend assets and inspected loading/display state only; no real-ledger write test, new dependency, schema change, push or deployment was performed. A local business implementation commit is now explicitly authorized.

## Follow-up Needed

The local implementation checkpoint and human approval are now authorized/recorded. Obtain native acceptance/hand-off records before closing checklist 1.4 or promoting acceptance.json. The previous separate Linux Verification V2 limitation has not been bypassed. Local effect is available for user review without implying release readiness.
