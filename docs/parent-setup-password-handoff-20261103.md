# Parent password and approval handoff — November 3, 2026

Published follow-up: this change is live in the [November 3 setup deployment](guard-release-1.2.341.md). The original preparation record below is historical.

Validated website source: `9e9367e` on `codex/launch-trial-policy`.
Companion child source: `a69c2695` in `vexonastudios/bodee-guard`.
Status: local source only, not pushed or deployed. The earlier `/install`
scroll/highlight improvement at `533029d` is also awaiting website deployment.

The active four-step guide omitted the legacy guide's family-password step.
After approving a computer, the child asked for a password in the dashboard,
while dashboard readiness sent the parent back to recovery setup on the child.

Step 1 now starts with the family parent password, followed by children. Its
meaning is explicit: parent controls and exiting the child app, including offline
access, separate from the website sign-in. Existing configured passwords are
shown as ready. Missing passwords return direct connect/resume links to Step 1;
the guide does not proceed to computer connection until the password is saved.
Stable persisted step IDs and saved family choices remain intact. This guides
normal onboarding; existing account/download and pairing API routes are unchanged.

The control uses the existing authenticated `set-parent-password` action. It
validates confirmation, reports failed saves, clears plaintext after a confirmed
save and on close, and never stores the password in the setup draft or browser
storage. A delayed snapshot offers Check saved password without another write.
Readiness separately identifies the saved family password, its receipt by a
computer, and that computer's offline parent access. It never infers delivery.

The approval page also removes the Paste code button and its clipboard API use.
Instructions and the field label identify the code displayed on the child's
computer. Ordinary typing and keyboard paste continue to work.

Verification on this source:

- Next production build and targeted ESLint passed.
- 94 website cases passed across activation, readiness, installer-code,
  installer-feedback and workspace tests. The workspace cache-version assertion
  was updated for the changed entry asset and its 63 cases rerun successfully.
- Four isolated Electron fixtures passed: connect/readiness (including missing
  password, mismatch, failed save, delayed confirmation, no duplicate save,
  closing/clearing secrets, and responsive layout), quick family setup, multiple
  school sites, and setup links inside the production iframe sandbox.
- Visual inspection: `.tmp/setup-password-desktop.png`,
  `.tmp/setup-password-phone.png`, `.tmp/activate-clarity.png`.
  All previews use fictional records and no real password or pairing code.

The website can ship first and resolve missing-password setup for older clients.
The clearer child screen needs the companion source in a future Windows release.
No API deployment, schema change, household mutation or installer execution was
needed for this task.
