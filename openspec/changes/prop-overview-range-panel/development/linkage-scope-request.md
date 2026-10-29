# Follow-up scope: Prop overview linkage

Status: user-approved product direction; follow-up change and development baseline pending. This is a planning record, not an entry, acceptance, review, or handoff receipt.

## User approval

The user approved the horizontal progressively narrowing funnel after reviewing `prototype/artifact/funnel.html` and `prototype/evidence/funnel-v2-desktop.png`: “好的我同意就这样做吧”. Earlier approvals also cover overview-wide date linkage, cohort-based conversion ratios through the selected range end, clickable stage/conversion lists and current-state navigation to My Accounts. This approval does not authorize Git commits, pushes, deployment or real-account tests.

## Approved behavior to carry forward

- The modern overview's single date range must govern the financial panel and the lower financial summaries, monthly breakdown and account progress. Current account status remains current, not historical.
- Funnel stages count accounts with the relevant progress occurring within the inclusive selected interval. Stage counts can belong to different cohorts and must not be divided directly to obtain conversion rates.
- Each connection follows the previous stage's interval cohort and counts its subsequent conversion through the interval end. Show the percentage and numerator/denominator.
- Stage counts open that stage's account list; conversion controls open the corresponding converted/not-converted cohort. Account rows lead to the existing account detail.
- Preserve the approved continuous left-to-right narrowing shape. Geometry is illustrative, not proportional to independent interval counts. On narrow screens retain the ordered horizontal flow with local scrolling rather than a four-card grid.
- Preserve both bottom summaries: pass rate with the resolved-evaluation-attempt explanation, and average cost per funded account with its calculation explanation. Their date attribution must be specified and tested before implementation, not silently inherited from all-time totals.
- The financial panel's eval/passed/funded current-state controls navigate to My Accounts using the exact current status, preserving company/group scope and not applying the financial date range.
- Reuse the approved shadcn-inspired native JavaScript adaptation, existing themes, light/dark, custom profit/loss colors, locales, escaping, form lifecycle and account detail entrypoints. No React migration, database migration, additional fetching or new write operation.
- Validate only with synthetic offline fixtures; preserve classic behavior outside the approved modern scope.

## Why a follow-up change is proposed

The original change explicitly excludes the lower panels in `requirements.md` and `prototype/handoff.md`. Its nine assertion identities are already pinned in `development/acceptance-freeze.json`. The installed development contract (`validateAcceptanceAssertions`) rejects adding, removing or rewording these identities; no freeze deletion or digest replacement is authorized.

Proposed follow-up ID: `prop-overview-linkage`. Preserve the original change, its pending final review, frozen assertions and uncommitted implementation. Register the additional requirements, prototype approval and acceptance separately; do not reuse original evidence as proof of the additional behavior.

The installed standard development entry (`validateGitBaseline`) requires the follow-up's own `tasks.md` to exist in Git HEAD. A new specifications/tasks-only local commit therefore needs explicit user permission. Do not stage existing business source, tests, local configuration, private previews or runtime evidence as part of that commit. No commit has been made for this follow-up.

## Remaining preparation

1. Obtain permission for a narrowly scoped specifications/tasks-only local baseline commit; no push or deployment.
2. Create and select the follow-up through the owning lifecycle tooling, record dependencies on the existing uncommitted implementation, and populate its requirements, behavioral acceptance and prototype handoff without changing the original freeze.
3. Verify event/date and auxiliary-statistics rules against the existing account/event model; surface any genuine unresolved product decision rather than inventing historical dates.
4. Run the owning requirements/prototype/development entry contracts. Only after entry returns `ok:true`, implement and validate the added behavior using offline synthetic data.
