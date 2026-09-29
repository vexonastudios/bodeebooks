# Optional parent Chores & Routines

September 29, 2026. Parent source paired with bodee-guard commit `caeca3d8`.
This is implemented and verified source, not a production deployment.

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

Deploy the additive chore schema and compatible API before this parent site.
Publish a compatible child and complete physical playback/time-boundary
acceptance through the existing release procedure. An explicit old-computer
warning is included; do not imply those computers can enforce timed restrictions.
No family was opted in during development. Background approval notifications,
starter suggestions and general desktop-app reward categorization are deferred.
