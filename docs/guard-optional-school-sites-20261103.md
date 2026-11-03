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

Prepared locally, not deployed. Next release: API first, then this website.
No migration, paid search provider, new secret or Windows release is needed.
