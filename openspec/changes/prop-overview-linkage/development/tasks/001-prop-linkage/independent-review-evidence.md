# Independent read-only review evidence

This file records scout findings and main-agent verification, not an independently issued `approved` verdict. No formal spec-review/quality-review receipt or stage completion is claimed.

## Specification scout — job_mvqjeiej_1

Terminal state completed; reported complete coverage. The scout read the task packet, incremental diff and retained execution evidence, cited A1–A8, and stated: “未确认到明确的规格偏差或必须修复项”. It explicitly declined a final Verdict and distinguished uncommitted source review from reviewed-HEAD approval.

Key checked evidence: `src/11d-prop-data.js:375–445`, `src/11e-prop-view.js:146–170,188–229,293–307`, `src/11h-prop-linkage.js`, `test/prop-linkage.test.js`, `development/evidence/browser-checks.json` and command logs. Main agent spot-checked lifecycle code, draft tests and original browser-result assertions. That review preceded the two quality fixes below, so it is not a final immutable source attestation.

## Quality scout — job_mvqjrmhk_2

Terminal state completed. Confirmed two issues:

1. Nested entry/edit-entry/status/balance forms rebuilt `back` as a bare detail object, losing the list origin after cancellation or success.
2. Current/historical blown status without recorded funded date or payout was not always disclosed as incomplete history.

Main agent verified the cited event handlers and unchanged save paths in `src/11e-prop-view.js`, and missing-date predicates in `src/11d-prop-data.js`. Both were reproduced in isolated unit regressions (`scout-findings-red.log`: 18 pass / 2 fail), then fixed without changing persistence functions or fabricating stage dates.

## Focused fix scout — job_mvqkidy8_3

Terminal state completed; scoped to the two fixes. Verified:

- `propLinkageOrigin` and `propLinkageDetailBack` retain the matching account's origin, including through nested `back` (`src/11h-prop-linkage.js:69–73`).
- Four existing open handlers now pass that detail back object; cancellation restores it. Linked-only modal labels and focus are added at the existing modal seam.
- Save routines continue using the existing persistence entries and restoring `m.back`. Unit tests substitute in-memory success functions; browser evidence only opens/cancels forms and shows `blocked: []`.
- `knownFunded` includes current and historical blown state solely for incomplete-history disclosure. Dated stage extraction still uses actual purchase/passed/funded/payout dates; instant does not create a passed event.
- No new definite defect identified in this limited recheck.

Evidence: `scout-findings-green.log`, `nested-entry-navigation.json`, `nested-status-balance-navigation.json`. Main agent additionally compared the three save-function bodies byte-for-byte against `before-linkage` and extended the unit regression to return from saved detail to its original list.

## Limitations and formal status

Scouts were read-only and did not independently execute browser/test commands. They supplied source/log evidence but no formal approved verdict receipts. Stored browser checks are synthetic Chromium runs, not physical-device or live-backend testing. The final-source manifest remains explicitly uncommitted. Acceptance statuses and frozen assertion identities were not changed to imply approval. Formal review, reviewed-HEAD checkpoint and handoff remain pending.
