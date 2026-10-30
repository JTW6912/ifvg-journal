# Authorized prop-test Git delivery

## Authorization and scope
After the connected local preview was synchronized, the owner explicitly requested: “帮我推送代码吧”. This authorizes committing and pushing both pending implementation changes to `origin/prop-test`:

1. Complete modern catalog ranking: remove homepage price comparison and whole-board collapse; retain hidden filtering, rank order, company details, administrator tools and classic behavior. Code/test commit: `9c77e4d` (`feat(prop): show complete catalog rankings`).
2. Glass compatibility: reuse `isModernLayout()` for 27 structural checks in eight existing Prop view/controller files; retain true `currentLayout()` identity for preferences and existing history context. The containing compatibility commit supplies the remaining source/test changes and these records.

This supersedes earlier local-only delivery restrictions for these changes only. It does not authorize a master push, live business writes, database migrations or unrelated changes. No human or formal verifier approval is inferred from the push request.

## Checkpoint and verification
The shipped source matches the locally checked and connected-preview resource version. Synthetic tests cover render parity, lifecycle/interaction guards, appearance identity and classic output preservation. `delivery-checks.json` records the source/test hashes and rerun commands.

The catalog-only staged tree passed 337 tests independently. The full compatibility source passed 352 tests, bundle and syntax checks. Previously recorded offline browser checks cover 336 theme/locale/width/view combinations and date, chart, sorting, tooltip, list/detail/history, catalog and administrator navigation. These browser records are local diagnostic evidence, not production-data tests or formal release acceptance.

## Public repository boundary
Only the two implementation changes, corresponding tests, requirements/component handoff records and concise delivery evidence are included. Configuration, credentials, screenshots, raw browser/session logs, ignored dev harnesses, unrelated older changes and verification drafts remain excluded. Runtime logs or connected account data must not be added to the public repository.

## Formal status
Frozen acceptance assertions and the outstanding formal review/verification task remain unchanged. This is authorized Git synchronization to the test branch (which may trigger a Vercel preview build), not a claim that SpecNav Verification 2.0 or release/archive gates have passed. Remote SHA and actual build status must be checked after push; this document does not pre-claim success.
