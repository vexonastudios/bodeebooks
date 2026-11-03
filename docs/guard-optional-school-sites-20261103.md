# Optional school websites — November 3, 2026

Step 2 now supports any number of school websites per child and permits
continuing without a school name/URL. Its per-child list supports adding,
editing and removing separate resources without replacing the other sites.
Names on the child dashboard are optional and can describe the subject.

Typing a provider or subject filters common sites locally. Explicit online lookup
uses the authenticated `find-school-sites` bridge action and the cloud API's
Wikidata directory lookup. It sends only the entered query, not student records.
This is not comprehensive web search: manual URL entry and a new-tab web search
remain available. A search selection is only a draft; Add website is required to
grant access. Failed lookup never prevents continuing setup. Unsaved URL edits
require saving or explicitly cancelling; a query by itself does not block Continue.

School selection is no longer a required readiness check. Existing activity,
device, recovery, parent password and computer-confirmation checks remain intact.
New school sites use existing weekday schoolwork defaults, explained in Step 2,
and can be changed in Daily Plan. Existing domain policies are unchanged.

Website base: `6ba6331` on `codex/launch-trial-policy`. All 288 unit tests, the
production webpack build and three isolated onboarding/connection fixtures passed.
Default Turbopack does not accept this worktree's existing external dependency
junction; `npm run build -- --webpack` passed without dependency changes.
Desktop/phone screenshots and fixture artifacts are in `.tmp/school-picker/`.
API, fixture and resource details are recorded in the cloud repository's
`docs/optional-school-sites-20261103.md`.

Workspace JS, onboarding imports and setup CSS use `20261103-schools1`; Overview
CSS retains its previous valid version. The active guide is website-owned.
Do not replace these files with an older full dashboard export.

## Production delivery — November 3, 2026

Published after the API, including the pending Overview disclosure improvements.

- Website source: `ca8a25ea65cfeca0f8e1469596216ee3f5efba92`.
  Deployment: `dpl_3zYb9NTBvWCQgS5WWqqnkWNMbZ3a`.
- API source: `0bb87499a635c120d3ae668cf0bfe6c4119d2902`.
  Deployment: `dpl_DGCF3QQDhbH4C9BVXPPEtcYNPC3c`.
- Previous website rollback: `dpl_DYBHrjQ6YzucuXLZh5GrvSgpZw5N`.
  Previous API rollback: `dpl_JA4aofRpnbzVih2Dg6mu5346oC9P`.

Clean source candidates reached READY and passed checks before promotion. The
public dashboard release endpoint reports the new deployment ID (the configured
release identity); changed setup and Overview assets match source with normalized
line endings. API public health passed, and school lookup requires account auth.

The live signed-in demo dashboard showed optional Step 2 and existing separate
sites, returned online Khan Academy/Khan Academy Kids suggestions, and filled a
selected URL into an unsaved draft. The draft was cancelled; no website or family
setting was saved. Compact exit/recovery disclosures and absence of Quizlet on
this family's Overview were verified. Local visual receipt:
`.tmp/live-optional-schools-20261103.png` (not committed).

Live: https://guard.bodeebooks.com/dashboard/ . No migration, paid search provider,
new secret, Windows release or update-feed change was needed or performed.
