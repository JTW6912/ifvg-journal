# Acceptance Criteria: prop-stage-history-repair

## User-Visible Criteria

A2 — A compact funnel-heading entry with pending count opens a pending/all searchable account drawer; the revised layout has no full-width notice above the diagram; current company/group applies, the diagnostic scope is full history rather than financial dates. No writes during inspection.
A3 — Each account shows specific missing/suspected reasons; instant accounts and genuine repeated attempts are not blanket errors. An undetected mistake is accessible from the all-accounts tab. Untouched unknown facts are not invented.
A4 — One-account draft permits separate purchase-date editing, positioned stage addition, type/date edits, draft removal and restore. Before/after confirmation lists exact changes; removal needs acknowledgement. Cancel/back preserve or explicitly discard drafts; no automatic save.
A7 — Saved history updates existing funnel/cohort/pass/company counts while all financial totals and current statuses remain unchanged. Remaining issues are disclosed. User filters/date range remain intact.

## System Criteria

A1 — Owner-authorized correction changes only existing own account bought_on/events and update metadata. No normal progression/fee/renewal helper or full-row upsert; all unrelated fields/ledger rows are preserved.
A5 — Duplicate submit/busy navigation is blocked. Missing row, changed owner or stale baseline abort safely. Errors retain drafts and saved data; reload-latest explicitly discards the draft. Read-only/unsupported root structures cannot be silently overwritten.
A6 — Deletion/reordering cannot make an arbitrary first historical record into the purchase event. Existing unsafe index-zero date behavior is not reused for repair; tests cover this integration seam before production handoff.

## Data Criteria

Real ISO dates within the existing UI's 1990–2099 range and known stage types are required for new/edited records. No today default, inferred missing step, automatic order/deduplication or cash-row movement. Repeated failures remain independent attempts. Saving one corrected fact may leave unrelated untouched gaps, with truthful feedback.

## Component Criteria

Pure reason/diff/patch helpers, isolated drawer draft and narrow mutation service. Reuse existing shell/help/localization rather than duplicate portals. All automated evidence uses synthetic data and no real Supabase writes.

## Verification Surfaces

- Facticity/static: exact mutable fields, owner RLS, existing schema, no forbidden helper/backend calls or unscoped UI changes.
- Unit: date/event/patch/diff/diagnosis boundaries, instant/multiple attempts, first-row removal, immutable unrelated fields.
- Redteam: stale snapshot/null version/missing row/owner changes, malformed input, double submit, XSS and protected-field attempts.
- E2E: offline inspection/search/edit/restore/diff/confirm/success/error/conflict and preserved cash/status/filter state.
- Sensory (A8): existing product shell, horizontal rounded date/status timeline, public company logo/fallback and compact heading entry; both languages/themes/all palettes, 375/768/1440-class widths, reachable states, visible focus and phone controls including local timeline scroll/reveal.

## Unresolved Gaps

None for prototype entry. Visual approval and production gate/transport/compatibility evidence remain later stages, not implied by this requirements packet.
