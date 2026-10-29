# Prop stage-history data inspection and correction

## User request

The owner wants an account-funnel entry for correcting erroneous data or missing stage history. The current missing-history notice only reports affected accounts as a count; it does not provide a dedicated diagnostic/correction workflow.

## Confirmed boundary

In response to the recommendation “第一版先只修正购买日期及阶段历史，不自动改当前账号状态，也不改投入／出金等收支流水”, the owner replied “可以”. This confirms the scope boundary only. History correction must not change current status, renewal behavior or any cash-flow row (including dates/amounts), create fees, infer missing dates, or replace normal state progression.

## Approved direction

A funnel-level data-inspection entry opens a list of accounts needing review, followed by a historical timeline draft and a before/after confirmation before an owner explicitly saves. Presentation inherits existing themes/locales and drawer/help patterns. The owner subsequently confirmed the default pending-issues list plus an additional searchable all-accounts tab with “好的”. The owner then explicitly confirmed draft removal of misrecorded events with a before/after acknowledgement, no automatic deduplication and no current-status change. Requirements now specify conservative diagnostics and draft/error/conflict safeguards. After requesting the existing horizontal status-timeline style, a less intrusive issue entry and company logos, the owner reviewed revision 2 and explicitly approved it: “好的就按照这样吧”. prototype/decision.json binds the approved source hashes; the native requirements/prototype handoff checks are green. This authorizes gated development preparation, not direct prototype promotion.

## Stage and safety

This is a separate change from the already pushed company-summary change c2e4c50. Do not alter previous acceptance records. Production edits may begin only after the development entry passes, including the committed task baseline. The owner subsequently authorized the specified ten-file local specification/task baseline with “好的”. This authorization excludes implementation commits, pushes, deployment, real-data inspection/tests/writes and schema changes. All development validation uses synthetic fixtures. No private screenshot values or credentials are copied into these artifacts.
