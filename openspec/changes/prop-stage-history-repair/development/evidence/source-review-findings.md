# Independent factual source review and main-agent resolution

These scouts are read-only fact finders, not formal SpecNav approvers. No `approved` verdict is synthesized from their reports.

| Evidence | Finding | Resolution and direct validation |
| --- | --- | --- |
| job_mvsy93wv_1 | Returned save timestamp only parseable, not tied to write; nullable purchase and partial-save gaps | Compare parsed returned timestamp with payload timestamp; test old timestamp, null guards, remaining malformed records and late UI current callback. |
| job_mvsy9lxo_2 / earlier job_mvshyzsf_5 | Loader loses malformed root, full-row writers unsafe for repair, legacy first event/parent draft coupling | Raw-root marker+snapshot retained; history-only conditional update; normal unrelated serialization preserves root and rejects mutation; dirty parent gate and isolated legacy date entry. Main agent read all cited seams before editing. |
| job_mvt0t8se_3 | Same session object can mutate owner while request pending | Save and reload require captured owner ID as well as session/client identity; test both operations. Ordinary save and renewal successful-path tests preserve raw root and normalized cache. |
| job_mvt0tqil_4 | Pending legacy date lost on opening; purchase helper still treated new first row as purchase; empty busy Tab trap | Capture deferred date before rebuilding modal. Remove positional event coupling from normal purchase-date helper while retaining its cash-date behavior and update hint. Heading fallback and first/last keyboard wrap. Full removal-save-normal-purchase-edit test now exercises both separate write paths. |
| Main browser checks | Mobile drawer overflows scrollbar width; keyboard heading Shift+Tab escape | Use parent width, not 100vw; 320/375/768/1440 matrices pass. Tab from heading stays inside, verified with native Shift+Tab. |
| job_mvt28281_5 | Reload can overwrite a newer same-scope cache row | Capture canonical full row before read and compare again before cache replacement. Tests mutate both version and nickname while read is pending; neither is overwritten. |
| job_mvt2zbs5_6 | Narrow follow-up on last reload fix | Confirmed captured snapshot and latest-row comparison address the stated counterexample; no new concrete defect identified in inspected function. Scout did not inspect canonical JSON helper; main agent checked that it serializes every object key recursively. |

## Evidence interpretation

Tests and local SQL executed by the main agent; scouts independently read code/tests/evidence, never queried real accounts. Browser evidence distinguishes native actions from DOM-dispatched actions. Any request already sent may complete server-side after UI identity/context changes; this code rejects late cache/UI updates but does not falsely promise to cancel a completed server write. Reload needs explicit draft-discard confirmation. There is no automatic retry.

No unresolved confirmed code defect remains from these findings after targeted regressions. Formal specification/quality approval and native acceptance/handoff remain pending rather than implied by this statement.
