# Spec Review (Human Approved): 001-monthly-cashflow

## Verdict

approved

Approval source: the project owner's explicit confirmation, “我觉得可以了，提交代码吧，人工已审核”, after viewing the connected monthly implementation. Recorded in development/human-review.json against exact unchanged source hashes. This is human approval, not a verdict attributed to the read-only scouts or the implementing assistant.

## Missing Requirements

Scout job_mvr5l14c_8 returned partial bounded evidence and did not identify a concrete missing implementation requirement. It verified the original bar markup/optional series, range-scoped caller, recovery denominator/cap, left-adjacent header and real ledger/detail seam against src/11e-prop-view.js:163,188-264 and src/11i-prop-months.js:22-70.

## Extra Behavior

No unrelated production behavior identified within the reviewed scope. Future unrecorded zeroes are excluded from optional lines; real dated future entries remain consistent with existing loaded-history behavior. No financial helper or classic CSS modification.

## Misunderstood Requirements

No confirmed misunderstanding. Recovery is not ROI and uses the reporting range, which may span years. No cumulative/net line is added; default remains bars only. The three month amounts are adjacent to the date, not right-aligned across the panel.

## Cannot Verify From Diff

The scout did not inspect all theme/storage/round-trip evidence. Main-agent supplemental evidence is present in development/evidence/browser-toggle-help.json, theme-matrix-final.json, browser-scope-lifecycle.json, overlay-geometry.json and test/prop-months.test.js; this does not turn the scout into a formal verifier. Browser metadata records reuse of a browser during each check, not proof of a newly installed browser or a physical device. The owner has now authorized the local implementation checkpoint. Native reviewed-HEAD acceptance and Verification V2 are separate from this human approval and are not claimed by this file.

## Acceptance Assertions Verified

The owner's approval covers the current monthly change; supporting evidence is mapped below without inventing a claim that the owner personally ran every command.

- A1: test/prop-months.test.js default/series/gap tests; browser-default.json, overlay-geometry.json and browser-toggle-help.json.
- A2: month/date/amount and range tests; browser-range-keyboard.json and browser-scope-lifecycle.json.
- A3: recovery, static SVG and grouping/detail tests; browser-toggle-help.json and browser-form-compatibility.json.
- A4: existing propMonthly/propSum remain unchanged; refund/pending/empty tests and browser-mobile-boundaries.json.
- A5: theme-matrix-final.json (224 checks), browser-mobile-boundaries.json and the long-amount regression.
- A6: no-storage/network toggle regression, classic hashes, lifecycle tests, browser-form-compatibility.json and browser-scope-lifecycle.json.

Browser files above are under development/evidence and contain synthetic local-check data. Root acceptance.json is not manually promoted; native evidence consumption remains separate.

## Required Fixes

No required code fix remains from the reviewed findings or the owner's approval. Preserve native acceptance/handoff follow-up separately; human approval does not assert Verification V2 completion or authorize push/deployment.
