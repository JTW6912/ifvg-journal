# Requirements: prop-stage-history-repair

## Summary

Add an owner-facing inspection and manual stage-history correction workflow to the modern Prop account funnel. This packet defines the agreed behavior and conservative engineering defaults for an isolated prototype. A verified prototype and explicit visual approval are still required before production development.

## Users & Actors

The current account owner only. No administrator access to another user's personal records. Browsing, filtering, diagnostics and draft editing never write to the backend.

## Confirmed Decisions

D1 — Owner replied “可以” to purchase-date/stage-history-only corrections: preserve current status, renewal configuration/watermarks, balance, other account fields and every cash-flow row, including dates/amounts. No inferred date or fee booking.
D2 — Owner replied “好的” to default “待处理” plus searchable “全部账号”, including accounts with syntactically valid but factually mistaken history.
D3 — Owner replied “好的” to removal of explicitly misrecorded events: draft marking, before/after confirmation, no account/ledger deletion, no automatic deduplication of repeated real attempts, current status unchanged.
D5 — Post-implementation domain clarification, explicitly confirmed by owner “可以”: purchase/evaluation failure/pass/funding/blown may occur on the same calendar day. An evaluation account may skip a separately recorded passed stage and enter funded directly; count it as passed at the valid recorded funded date for statistics only, never add/modify stored events. Genuine instant plans do not gain an implicit pass from funding. The existing rev2 visual composition and all persistence boundaries remain approved and unchanged. See `rule-clarification.md` for executable scenario obligations and frozen-assertion mapping.
D4 — Visual revision request: account editing should reuse the existing horizontal rounded date/status timeline; the full-width notice above the funnel is poorly placed; company logos should replace letter-only avatars. Revised proposal consolidates pending count into the heading's data-check button, uses date/status capsules with connectors and adds public catalog logos with safe fallback. This feedback does not approve production development.

## In Scope

R1 — Add one “数据检查” entry in the funnel heading, with the pending-account count and an accessible explanation. Do not retain the large full-width issue notice above the graph in the revised proposal. The entry opens one drawer, default pending issues, with a searchable all-accounts tab. Respect the current company/group scope, but inspect that scope's full available history regardless of the financial date picker; missing dates cannot be reliably filtered by date. Display this scope explicitly. No new data request just to open the drawer.
R2 — Return per-account issue reasons, not merely IDs. Definite data gaps: absent/invalid purchase date, invalid recorded event date/type, missing known passed/funded/failed stage using existing evidence rules. Instant-funded plans are exempt from requiring passed. Suspected issues: event before purchase, inverted recorded date order, identical state/date entries. Suspicions are “待核对”, not evidence to delete or reorder. Legitimate resets and multiple failures remain separate attempts. Current status and valid payouts may indicate missing history, never supply its date. D5 refines missingPassed: if an evaluation account has no recorded passed event at all, a valid recorded funded date supplies derived pass evidence, not a missing-stage issue or a stored event. A present but invalid passed record remains a diagnostic problem, not silently replaced. Equal days are legitimate. Consecutive identical stage/day rows remain suspected duplicates; repeated stages after a real intervening transition/reset are legitimate attempts even on the same day. Ledger-date problems are labelled outside repair scope and point to existing ledger editing, never silently patched.
R3 — Open one account at a time. Show current status read-only, purchase date separately, and historical event rows in their existing recorded order. Permit adding at an explicit position, editing the selected stage/date, marking a selected record for removal and restoring it before save. Use local stable draft IDs, not editable-row position as purchase identity. Preserve untouched record data; do not sort or deduplicate implicitly. Unknown dates remain visibly unknown. New/edited fields must be valid real ISO days within the existing 1990–2099 UI range and known stage types; never default a missing date to today.
R4 — Draft mutations do not change displayed saved statistics until explicit save. The next step shows only actual additions/edits/removals and a clear purchase-date warning when relevant: ledger dates will not move. Removal requires explicit acknowledgement in the confirmation step. Back returns to the same draft; closing/navigation with unsaved edits offers keep editing or discard. Busy save disables duplicate submit/close. A user may correct one known issue while leaving other untouched gaps for later; the result must disclose remaining issues rather than claim the account is fully repaired.
R5 — Save only bought_on/events plus normal update metadata to an existing own account; do not use full-row upsert, normal status transitions, renewal or ledger helpers. Preserve all unrelated fields and rows byte-for-byte. Missing account, changed owner/session or concurrent row changes abort instead of overwriting. Validate the saved result before updating local cache/statistics. Error/conflict retains the draft; reloading the latest record explicitly discards that draft, with confirmation. No automatic retry or persistent multi-level undo is introduced; draft restore is supported and later factual corrections use the same editor.
R6 — After a confirmed save, recompute pending reasons and existing funnel/cohort/pass-rate/company statistics from the saved history, preserving the financial range, company/group filters and current state display. Cash totals remain unchanged. D5 derived pass evidence is shared by range stages, cohort lists/conversions, pass rates and company summaries; explicit passed events take precedence, instant funding alone is excluded, and list copy identifies a funding-derived pass date. The classic all-time funnel retains its status-based semantics, but does not count instant funding alone as a pass. Do not hide a continuing issue. Financial-error/no-account/loading/permission guards remain owned by existing code.
R7 — Match current modern shell, funnel, drawer and field-help design; desktop and mobile, seven palettes, light/dark, zh/en. Reuse the visual language of the existing horizontal date/status capsules and arrows, not its immediate-save handlers. Public company logos appear in lists and account headers, with letter fallback only for missing/failed images. Long timelines use contained horizontal scrolling on mobile with keyboard reveal. No redesign of the funnel, React migration, new preference or duplicate tooltip portal. Visible focus, keyboard tab containment, Escape priority and safe text/ARIA must work. Empty/no matches/no issues/read-only/invalid/busy/error/conflict/saved states are reviewable.
R8 — Protect the legacy date seam: a newly first event after a removal must never be treated as a purchase event by position. New repair save is entirely independent of propMoveBoughtOn/propSaveEventDay/propChangeStatus. Production integration must remove the unsafe positional assumption for historical-event edits (or route them through the explicit history editor), without changing normal purchase/ledger operations outside this repair flow. This integration risk must be proven with synthetic regressions before development handoff.

## Out of Scope

Current-status/renewal/balance/plan/ledger edits; generated fees or payouts; fabricated or persisted inferred history (D5 is a read-only statistical derivation from a known funded date, never a stored event); bulk/automatic repair; automatic array ordering/deduplication; cross-user/admin permissions; audit-dashboard or persistent undo system; financial formula changes; agent operations against real accounts; production edits, commits, pushes or deployment during requirements/prototype review.

## UI Design Impact

One cohesive inspection → editor → difference confirmation drawer in the existing shell. Pending/all tabs are approved; exact visual composition remains for prototype review. Clear distinction between missing facts and suspected mistakes. Date-independent diagnostic scope and unchanged status/cash boundaries must remain visible without flooding the page with explanation text. Use synthetic accounts and amounts, never copy private screenshot data.

## Theme & Locale Capability Impact

Existing light-dark modes, seven palettes, existing theme toggle and status/P&L token separation. zh/en via T(), existing account/local/browser precedence and en fallback. Preview-only theme/locale/scenario controls are allowed to expose review states, excluded from production. Review both languages and themes, mobile and desktop.

## Architecture & Database Impact

Existing prop_accounts has bought_on date and events jsonb; updated_at is nullable. No schema migration is currently proposed. A narrow owner-scoped update and read-back uses original updated_at (including an explicit null condition) plus original history/purchase values as compare conditions where necessary; zero matched rows is a conflict, not success. No version-field invention. No full-row propSaveAccount upsert. Atomic account-only mutation means no multi-table partial save. Unsupported malformed root history structure must block editing with a clear explanation rather than replace it with an empty array. Production transport/compare semantics must be independently verified using mocks before deployment; prototype only simulates this behavior.

## Frontend-Backend Data Flow Impact

Cached scoped account/history → pure reason model → isolated draft → pure patch/diff/validation → explicit owner save → verified returned history → existing statistics. Rendering/list/search/confirmation cause no write. Permission/conflict/error does not mutate local saved data. Existing propMoveBoughtOn shifts purchase/activation ledger dates and is forbidden for this flow. Normal state editing appends a today-dated event and may alter renewal/fees, also forbidden as backfill.

## Component Architecture Impact

Create CMP-PROP-HISTORY-INSPECT, CMP-PROP-HISTORY-EDITOR and CMP-PROP-HISTORY-DIFF in a focused Prop domain module, with pure diagnosis/patch helpers separated from DOM and transport. Reuse shared drawer/help, T/esc, date validity and finance/cohort helpers. One owner-scoped history-save service. Do not put all behavior into legacy 11e. Exact filenames belong to the development scope packet, not this prototype.

## Source Evidence

src/11h-prop-linkage.js:23–25 (text-only notice); src/11d-prop-data.js:397–448 (current missing-history/event semantics), 553–570 (full-row upsert), 611–617 (normal state progression side effects); src/11e-prop-view.js:1097 (initial event based on starting status), 1220–1224 and 1270–1309 (array-position date coupling); supabase/migrations/20261024000000_prop.sql:70–114 (events/bought_on/updated_at and owner RLS). Read-only scout job_mvsad262_3 corroborated these paths; main agent checked source. No live database was queried. Current c2e4c50 behavior supersedes historical top-panel-only foundation prose.

## Unresolved Gaps

None preventing this isolated prototype. D1–D3 are owner decisions; R2–R8 conservative validation/lifecycle defaults are explicitly reviewable in the prototype. This is not visual or development approval. Production entry must address the legacy first-event seam and prove real transport concurrency semantics without real-ledger tests.
