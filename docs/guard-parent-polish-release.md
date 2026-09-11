# Family Default and parent dashboard polish — September 11, 2026

The BodeeGuard source changes in `c19f6d9` had reached GitHub and child release
1.2.219, but the parent website still served deployment
`dpl_2aGz5UNHFAGk1ogyK2kmTWkY9Tbt` from website source `8f504c3`.
This website release starts from that deployed source and transfers the pending
Daily Plan, Overview and Messages changes while preserving its other dashboard
integrations.

- Fresh dashboard loads select **Family default · all children** first. Explicit
  child selection is retained during subsequent snapshot updates.
- The Family Default banner is gold. Opening the default uses the loaded family
  snapshot without an extra per-child plan request.
- Overview actions share one right-aligned group with 16px icons.
- Messages places the text field above a toolbar containing voice, attachment,
  clear and send controls. Existing delivery and voice behavior are preserved.
- Updated asset URLs cause returning browsers to fetch the changed UI files.

The source implementation passed the prior BodeeGuard full verification. Website
verification for this transfer: three focused family-plan/message/revision bridge
tests, 18 refresh/reconnection/PWA tests, TypeScript and the production build all
passed. An isolated Electron fixture verified fresh-load/reload selection,
retaining an explicitly chosen child, no initial default-plan request, the gold
border, Overview icon sizing, composer structure and mobile overflow. Desktop
and mobile captures were inspected. It used synthetic students and a separate
profile; no live plans or messages were changed.

Local fixture and build evidence is retained in the BodeeGuard checkout under
`.tmp/check-parent-polish.cjs` and `.tmp/verification/parent-polish-*`.
The child installer itself is the existing 1.2.219 test release.

## Publication and acceptance

Website source `eda653e` was deployed and promoted to the existing production
domains as **`dpl_HZW9V6egpkctEQ7UED5ewoXXJdQa`**:
`bodeebooks-2tzevimza-vexonastudios-3984s-projects.vercel.app`.
The deployment sets `BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION=1.2.219`.
At **2026-09-11 23:49:55 UTC**, all six public JS/CSS assets matched the reviewed
release files by SHA-256.

A fresh authenticated load of guard.bodeebooks.com/dashboard/ then verified
**Family default · all children** was selected upon opening Daily Plan. Messages
showed the text field followed by Record voice, Attach a file, Clear attachment
and Send in the new tools container. The account page showed **Version 1.2.219**.
No family settings were saved and no messages or computer commands were sent
during this acceptance check.
