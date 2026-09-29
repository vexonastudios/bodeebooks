# Optional parent Chores & Routines

Published to the private Family Beta parent website on September 29, 2026 with child 1.2.269 and the compatible commercial API. Existing families remain off until a parent chooses the feature. See the matching BodeeGuard `docs/cloud-release-1.2.269.md` receipt. Real Windows child-computer chore timing remains to be checked.

September 29, 2026. Parent source paired with bodee-guard commit `caeca3d8`.
The implementation and verification described below preceded production publication.

The parent bridge forwards chore operations through existing account authority
to `/v1/account/dashboard/chores`. No family or user identifier from the browser
selects the account. Parent JS/CSS comes from the chore export recorded in
`app/guard/dashboard/generated/workspace.json`; newer existing dashboard assets
were preserved instead of overwritten by a full export.

The active Family Setup flow (`cloud-parent-start.js`) explicitly offers Use
Chores & Routines / Skip in the activities step. Direct computer setup cannot
finish a new family without that choice. Merely selecting a radio is a draft;
save persists it. Read-only readiness refresh remains available before choosing.
The retained `cloud-parent-setup.js` flow offers the same choice. Existing
families remain off and can enable the feature later in Settings.

Enabled families have a compact Overview summary, per-child summaries, mobile
More navigation, and the full Today / Needs approval / Schedule / History page.
Parents schedule individual assignments, choose rewards to pause, approve or
return completion, excuse work, edit future repeats and grant explicit temporary
chore exceptions. Coins and access decisions remain server-authoritative.

Verification: 90 relevant parent tests, production `npm run build`, and the
isolated `guard-connect-readiness.electron.cjs` browser flow passed. The latter
covers explicit no-default choice, saved Skip, later opt-in from the active
activities step and phone/desktop layout. The matching source chore browser
fixture verifies schedule, submission, mobile approval and coins; exported
chore JS/CSS hashes match that source. It also passed the cloud repository's
2,152 unit tests, native checks and all 46 Electron scenarios, with final
targeted rechecks recorded in its `docs/cloud-chores-implementation.md`.

The additive chore schema and compatible API were published before this parent
site, and the compatible child was published to Family Beta. Physical
playback/time-boundary acceptance remains. An explicit old-computer warning is
included; do not imply those computers can enforce timed restrictions. No
family was opted in during development or publication. Background approval
notifications, starter suggestions and general desktop-app reward
categorization are deferred.
