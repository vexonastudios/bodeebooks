# Family setup completion — September 27, 2026

The guide previously combined current connectivity, pause state, control
confirmation and parent recovery into one unexplained check. This prevented a
confirmed family from finishing while a computer was switched off.

The parent website now separates durable setup checks from everyday online and
paused status. Each missing requirement names the next action. Completed checks
collapse. The last step offers **Finish setup & hide reminder** when requirements
are satisfied, or **Save & finish later** with an explanation that the reminder
stays. Completing uses the existing revision-checked household setup record, so
it persists across parent devices. Family setup remains available from controls
and settings. Missing school choices, recovery or password configuration on assigned
computers still surfaces after completion; ordinary later control changes do not restart setup.
The school sign-in check is explained separately without pretending it can be
verified from the dashboard.

Before finishing, the UI refreshes the family snapshot and refuses completion if
refresh fails or a required check has changed. Failed saves retain the reminder.
No cloud schema, API policy, child installer, child data or family settings were
changed for testing. Existing parent installer version remains 1.2.251.

Validation:
- 14 setup-state regressions: offline/paused, confirmation, recovery, password,
  missing/revoked/new devices, multiple computers, archived children and choices.
- 69 other related website account, journey, school, dashboard and workspace
  checks (83 unique website tests including the new 14).
- Extended synthetic phone/desktop connection fixture: save/retry, initial
  assignment acknowledgement, finish while offline, failed completion, concurrent
  recovery change, reload persistence and required recovery loss resurfacing.
- Existing cloud parent-start fixture: full new-family flow, activity preview,
  unchanged existing plans, save failures, pending confirmation and completion.
- Focused dashboard gate: 172 cases / 35 files, static checks and 5 Electron
  scenarios. Timings: static 2.3s, unit 8.9s, Electron 55.3s. Not a full-suite run.
- Website production build: compilation 2.7s, TypeScript 3.3s, build successful.
- Synthetic screenshots inspected at 390x844 and 1280x900. Footer actions remain
  visible and within the viewport; no horizontal overflow.

Source owns the parent guide in public/guard-admin; do not overwrite these files
with an older full cloud export. The cloud repository only updates the existing
onboarding fixture's expected button labels. Deployment receipt follows below.


Live verification revealed a second reason for the recurring reminder: a family
can have saved profiles whose computers will be connected later. A family with
at least one fully configured child computer can finish while preserving those
unassigned profiles. The guide explicitly names who will be connected later.
An assigned computer still cannot skip missing initial confirmation or recovery.
A family with no configured computers cannot finish. Completed families keep
Family setup available; connecting a deferred profile resurfaces any required
checks for that new computer. No profiles are archived, reassigned or removed.

The original focused dashboard results above are retained for unchanged cloud
code. After this refinement, all 14 model tests and both affected browser
fixtures passed again, including partially connected families, reload persistence
and newly connected profiles with missing recovery.
