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
Production publication and authenticated acceptance are recorded below after
deployment. The child installer itself is the existing 1.2.219 test release.
