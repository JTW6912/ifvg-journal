# D6 — use the existing company avatar in funnel account lists

## User decision and narrowed scope

Owner requested company logos instead of generic account icons in the funnel's account list. They explicitly narrowed the earlier proposal: “1.暂时字母占位吧 2.好的。开始处理吧”. Alpha Futures, Nexgen and YRM keep their existing company-table letter placeholders. No additional logo asset, alias, directory row or account firm assignment is requested.

## Standard-lane continuation

The attempted independent light scaffold was not created: path-aware triage returned `light-change:triage-standard`. No light mode is forced and the existing standard change is not downgraded. The narrowed request is a presentation clarification of R7's public logos in account lists, attached to existing task 001 / items 1.2–1.3. The current standard development entry returned `ok:true` for `prop-stage-history-repair` before any production edit. Baseline task IDs and frozen acceptance assertions remain unchanged. No new committed task baseline is needed for this existing slice.

## Exact implementation boundary

Replace only the fixed generic avatar in `propLinkageListContent` with `propHistoryLogo(a)`, the already implemented and visually approved avatar used by the history lists and headers. Preserve the outer row button, all data-action/ID attributes, text/status/date/provenance, arrow, ordering, counts, cohorts and click/back/focus behavior. This affects bought/passed/funded/paid lists and both converted/unconverted partitions, not the icons on the main funnel diagram.

The reused component already delegates to `propCompanyLogo`, allows only existing local image paths, falls back to a letter when unavailable, and handles image-load failure. Its 38px square, rounded border and theme variables remain unchanged. Neither resolver, shared CSS, existing asset files, company-summary rendering nor the history component needs modification. This extends the existing 11h → 11l presentation dependency (11h already uses propHistoryEntryHtml); it introduces no fetch, state, workflow or write interface.

## Review and validation plan

Read-only scout job_mvtjooee_3 checked the renderer/helper/CSS/error-listener/bundle seams; main agent inspected the cited functions. Findings: reuse is display-only, error fallback is globally applicable, row dispatch remains on the outer button, and the wider avatar requires narrow-screen checks. This is factual shared-seam review, not a formal spec/quality acceptance verdict.

Add separate synthetic regression tests for local logo resolution, no-match/unsafe-path fallback, loaded-image error handling, all four stages and both conversion partitions, unchanged counts/row actions and unchanged company-table output. Reuse the isolated actual-source history harness for native click/back, 320px/mobile and theme checks. The initial implementation clarification did not authorize real Supabase interaction, public screenshots containing private data, commits or pushes. Formal acceptance remains pending.

## Subsequent preview and Git delivery authorization

The owner subsequently requested the connected local preview, then confirmed “可以推送吧”. This authorizes committing D6 and a normal fast-forward push to `prop-test`, not a master merge, new business write, formal verification approval or archive. See `development/d6-git-delivery.md`. The public record contains no real account identifiers, amounts, credentials or screenshots.
