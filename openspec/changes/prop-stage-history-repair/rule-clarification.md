# D5 — same-day stages and implicit statistical pass

## Owner decision

Owner explained that purchase, exam failure, pass, funding/activation and funded-account failure (blown) can happen on the same day. An evaluation account can go straight from eval to funded without a separately recorded passed stage, and should count as passed. The assistant proposed using its recorded funded day for the statistical pass, without inserting history. Owner replied “可以”. This is approval of this behavior clarification, not a source commit, push, live test or new visual design.

## Exact rule

1. Equal dates are allowed across stages. Keep every recorded failure attempt; an eval → failed → eval → failed sequence on one date is a legitimate reset/retry. Only consecutive identical known stage/date records remain suspicious duplicates; never delete or collapse them automatically.
2. A non-instant account with **no explicit passed event at all** may derive pass dates from its valid recorded funded events. Missing plan type continues the catalog's existing evaluation default. Explicit passed records take priority across the full history, before applying a financial range. If an explicit passed record exists but its date is invalid, preserve that problem rather than hiding it with a funded-date fallback.
3. Funding alone never supplies an implicit pass to an instant plan. Existing explicitly recorded pass evidence remains explicit; no instant record is relabelled or generated.
4. Current funded/blown status, a blown event, payout date, purchase date or today's date do not supply a missing funded/pass timestamp. Invalid/absent funded history still requires review. Date bounds of each existing consumer remain unchanged.
5. Dated stages, matching stage/cohort lists, transitions, pass-rate and modern company summaries consume the same derived pass evidence. Range boundaries remain inclusive, including same-day conversions. Explicit recorded pass days do not move to a later funded period. Classic all-time counting retains its original undated status semantics, but instant funding alone no longer counts as passed.
6. Derived list rows and summaries disclose the funding-derived pass basis. The original account events/timeline, status, updates, cash, renewal and balance remain byte-for-byte unchanged. This rule does not add anything to the correction payload or transport.

## Relation to frozen acceptance and approved prototype

The eight frozen assertions in acceptance.json are retained byte-for-byte (identity digest remains 22fefcc720d9ecc6e875e5cc30bfc39ee7b3d8a53b8f043fda821e72a9f6feea). No assertion is deleted, renumbered, marked passing or weakened. A1/A3's no-invention guarantees still prohibit fabricating unknown dates or inferred stored records; D5 derives a value from an existing dated fact with explicit provenance. A3 gains precise legitimate-attempt and missing-stage examples; A7's truthful stage/statistics behavior is evaluated against this owner-confirmed rule.

Rev2 visual source hashes stay unchanged. The original prototype remains evidence for layout/workflow only, not evidence for D5's updated counts or diagnosis. Supplemental pure-model/real-renderer regressions and isolated browser scenarios must demonstrate D5 before reporting local completion. Existing prior-stage statistics evidence is not silently relabelled as D5 evidence.

## Regression obligations

- Same-day purchase/failure; purchase/pass/funded/blown; eval/funded/blown with implicit pass and unchanged current status.
- Same-day reset and repeat failures remain two attempts, not duplicate warnings; adjacent identical records remain suspected, unchanged.
- Evaluation direct-funding, instant exclusion, explicit earlier pass priority, malformed explicit pass, missing/invalid funded date and current-status-only cases.
- Range boundary/day-before/day-after, funding after cutoff, derived pass stage/edge provenance and list/company numbers.
- Inputs frozen/no mutation, no DB/normal-save/renewal helper calls, correction payload/events untouched; all pre-existing tests retained except the one assertion deliberately superseded by D5's formerly excluded evaluation bypass.

## Scope and task binding

D5 refines requirements R2/R6 and tasks 1.1/1.2/2.5. Keep all eight baseline task IDs; no additional Git baseline commit is required by this amendment. Source: 11d shared evidence/report, 11k diagnostics, 11h list provenance and i18n explanations. Tests: new prop-stage-semantics.test.js plus the obsolete expectation in prop-linkage.test.js. No database/dependency/state/controller/layout changes. Use explicit shared-seam/frozen-test review records and rerun native requirements/development entry before edits.
