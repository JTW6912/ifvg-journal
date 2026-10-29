# Prototype Handoff: prop-stage-history-repair

## Approved Branch Variant

- Branch: `ui-html`; repository branch: `prop-test` at `c2e4c5018863618aa8c6e33fecfa23318e3995b5` before the new implementation.
- Variant: `history-repair-drawer`, visual revision 2.
- Entry: `prototype/artifact/index.html`; review URL `http://127.0.0.1:45433/?rev=2`.
- Explicit owner approval: “好的就按照这样吧”, following the revised horizontal timeline, compact heading entry and company-logo preview. Approval applies to this feature direction and development preparation, not Git submission, deployment or real-ledger testing.
- Exact approved artifact hashes are recorded in `prototype/decision.json`; verified against `prototype/evidence/revision-source-check.json`. Production must be reimplemented after the development gate, not copied/promoted directly.

## Screens Or Flows

1. Existing modern funnel remains intact. A single heading “数据检查” control carries the pending count; no large notice above the diagram.
2. Inspection drawer defaults to pending reasons; searchable all-accounts tab includes undetectable factual mistakes. Current company/group applies; inspect full account history, not only the financial date range.
3. One-account editor separates purchase date from a horizontal rounded date/status timeline. Existing status colors and public company logos match the product. Date/type corrections, explicit-position insertion and draft removal/restore are available.
4. A difference screen lists exact additions, edits and removals. Removal requires acknowledgement. Only explicit confirm saves; back/dirty-close/busy/conflict/error states are deliberate.
5. Successful history-only save refreshes existing statistics and remaining reasons, without altering current status, cash records, renewal/balance or filters.

## Components To Create

- `CMP-PROP-HISTORY-INSPECT`: pure issue reasons + scoped pending/all search + compact entry count.
- `CMP-PROP-HISTORY-EDITOR`: immutable baseline/draft, original event identities, horizontal controls and removal/restore.
- `CMP-PROP-HISTORY-DIFF`: exact patch review, removal acknowledgement and lifecycle feedback.
- A narrow owner-scoped history mutation service and isolated test harness. Keep pure domain logic, transport and DOM responsibilities distinct.

## Components To Reuse

Existing `propModal`/`secondaryModalRoot` shell, theme/locale functions, `T`/`esc`, valid date helpers, status-pill markup, catalog logo resolution and local assets, existing financial/cohort/company calculations, shared help if needed. Reuse lifecycle integration, not old field-position or full-row-write behavior. No global modal root, React framework, new tooltip portal or preference system.

## Extraction Targets

A focused history model module and UI controller, not another large block in 11e. Distinguish recorded order from chronological warnings: neither implicit sorting nor deduplication is allowed. Current load normalization turns non-array events into an empty list; preserve an in-memory invalid-history marker during loading so the new editor blocks unsupported roots instead of treating them as genuinely empty. This marker is not a persisted field.

Legacy compatibility: history-date edits must never infer purchase identity from array index zero. Production must use an events-only guarded mutation for historical dates, or route such edits to this history editor; it may not shift purchase/activation entries. Explicit normal purchase/account/ledger operations outside the repair flow retain their separate behavior. Dirty detail drafts must be protected and must not later overwrite a corrected purchase date. No unrelated form rewrite is approved.

## API Contracts

- Inspection/search/draft/diff use already-loaded owner caches; no fetch or write during rendering/opening.
- Confirmed save updates an existing `prop_accounts` row only, with whitelisted `bought_on`/`events` and update metadata. Apply explicit id + current owner + original version/history/purchase comparisons; handle nullable `updated_at` explicitly. Existing schema and owner isolation are unchanged.
- Use a narrow conditional `update`, never full-row `propSaveAccount`/upsert, normal status transition, renewal, ledger write or account deletion helpers.
- Zero matched rows, missing account, changed identity, unsupported root, error or unverified response is not success. Retain draft and protected saved data; no automatic retry. Reload-latest requires explicit discard confirmation. Verify returned row before updating cache; stale completion must not touch a different session/modal.
- No new endpoint, table, RPC, dependency or schema change is planned. Runtime transport behavior must be tested with a synthetic query/mock harness; prototype memory simulation is not proof of real Supabase execution.

## Data Flows

`FLOW-PROP-HISTORY-INSPECT`: owner cache + company/group → pure diagnoses → pending/all list.

`FLOW-PROP-HISTORY-DRAFT`: selected saved snapshot → isolated purchase/history draft → validated diff and removal acknowledgement.

`FLOW-PROP-HISTORY-SAVE`: explicit confirm → owner/version/history-conditional narrow update → validated returned history → safe local cache merge → existing funnel/cohort/pass/company consumers. Preserve all ledger rows, status, renewal/balance/plan/unrelated fields, including on cancellation, failure and conflict.

## State Behavior

- Loading: reuse application load guards; do not trigger `loadPropData`/automatic renewals from this flow.
- Empty: no accounts, no issues and no search matches are distinct; all-accounts access remains available when pending count is zero.
- Error: keep draft and expose useful escaped feedback; no false saved state. Retain malformed records unless the user explicitly corrects/removes them.
- Disabled: no-change/read-only/invalid/deletion-without-ack/busy controls have clear reasons; busy blocks back/close/duplicate submit.
- Permission: only own records, never another user through an admin role. Identity invalidation must not save a draft or contaminate the new identity.
- Conflict: abort rather than overwrite; keep draft, allow back or explicit reload/discard.
- Dirty navigation: keep editing or explicitly discard. Parent form drafts cannot be silently cleared or resurrect stale corrected values.
- Partial correction: permit known valid changes while untouched unknown facts remain; report remaining issues rather than asserting full repair.
- Focus: one dialog, visible focus, keyboard containment and return; mobile timeline scroll reveals focused/added controls.

## Theme And Locale Policy

- Theme support: existing `light-dark`, seven palettes, status/P&L token separation.
- Theme modes shown in prototype: light and dark across gold/sky/violet/rose/sunset/ocean/graphite.
- Theme toggle: existing product controls only; prototype review controls never ship.
- Internationalization: enabled, all new copy/ARIA in `i18n.js` through T.
- Locales shown in prototype: zh/en; product default fallback remains en with existing profile/local/browser precedence.
- Locale switcher: existing product switcher; preview-only switcher excluded.
- Namespaced foreground contrast adjustments do not overwrite global tokens. Public logo examples are synthetic fixtures, not a hardcoded production company list.

## Out Of Scope Items

Current-status/renewal/balance/plan changes; any cash row mutation (including dates); inferred events/dates; bulk repair; implicit event sorting/deduplication; account deletion; persistent undo/audit dashboard; changes to finance formulas, shared theme palettes or unrelated pages. No agent operation against real ledger data, no commits/push/deployment without separate authorization. No direct promotion of generated shell, extracted runtime, review controls, test data or finite demo logo map.

## Required Tests

A1–A8 from `acceptance.json`: immutable diagnosis/patch and malformed inputs; instant/repeated attempts; zero/current/partial facts; purchase-only/events-only payload and protected-field assertions; owner/id/null-version/history compare; zero/multiple/unverified rows; errors, conflict, duplicate submit and stale async completion; first-event deletion/edit with no purchase/cash alias; dirty parent preservation; initial/remaining issue counts; existing statistics unchanged except allowed historical derivations; classic legacy display and adjacent overview/month/company regressions; theme/locale/mobile/focus/escape/safe-text tests. All inputs are synthetic and all mutations mocked. The prototype's 10 model tests, 24 UI assertions and 560-case matrix are reference coverage, not production acceptance.

## Open Risks

- Existing events have no mandatory stable id or type/order constraint. Preserve original objects and use local draft keys; no accidental property loss.
- `updated_at` is nullable and no trigger was found in the checked migrations; original content comparisons matter as well as the timestamp. This is repository evidence, not an audit of the live database.
- Old first-event save can move cash dates and clear detail drafts. New flow must not call it; compatibility tests must cover subsequent legacy edits after a removal.
- Original all-history pending diagnostics differ deliberately from date-scoped financial reporting. Keep that explanation clear.
- Local mocks do not certify live PostgREST/RLS or full accessibility/physical devices. Formal Verification V2 has a separately recorded Linux runner limitation; do not relabel prototype checks as full release verification.
- Requirements/prototype approval does not bypass the committed-tasks baseline, development entry, review or submission authorization gates.
