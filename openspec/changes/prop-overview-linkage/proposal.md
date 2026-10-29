# Link the modern Prop overview to one reporting range

## Why

The approved financial panel currently filters only its own values. The user has now approved overview-wide linkage, a progressively narrowing horizontal account funnel, explainable cohort conversion lists and current-status navigation. This is a follow-up to `prop-overview-range-panel`, whose nine acceptance identities and unfinished final review remain unchanged.

## What Changes

- Apply the modern overview range to lower financial summaries, monthly detail and dated account progress.
- Render the approved continuous horizontal funnel with clickable stages and cohort conversion ratios through the selected end date.
- Preserve the two bottom statistics and explanations, with explicit range-aware denominators.
- Open account lists and existing detail; navigate current eval/passed/funded counts to exact My Accounts filters without a historical-date filter.

## Capabilities

### New Capabilities

- prop-overview-linkage: unified reporting range, dated funnel cohorts, drill-down lists and precise current-state navigation.

### Modified Capabilities

No database, API, authentication, ledger-writing, renewal or framework change. Classic presentation remains unchanged.

## Impact

Reuse the uncommitted preceding implementation in the current prop-test worktree as an explicit dependency, not as a clean or accepted Git baseline. Extend Prop pure functions, modern view/controller, existing list/detail seams, modern CSS and bilingual copy; validate only with synthetic offline data. The user authorized a local commit of this follow-up's specifications/tasks only. Existing business code, tests, configuration and private data must not be included; no push or deployment.
