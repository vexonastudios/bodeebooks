# Parent Family Games settings

Published with Family Beta 1.2.306 on 2026-10-10T21:06:45Z.

The shared cloud game editor now supports Settings for all children as well as
individual settings. Its mobile form keeps Save/Cancel and error feedback visible
while the fields scroll. Bulk saves name each failed child, retain the exact draft
and retry only unconfirmed children. Daily Plan conflicts require a fresh review.
The authenticated dashboard bridge forwards expectedSettings to detect those edits.

The matching commercial API fix lives in the BodeeGuard worktree
C:/Projects/worktrees/bodee-guard/student-today-dashboard. See its
[full fix and release receipt](../../../bodee-guard/student-today-dashboard/docs/family-games-settings-20261010.md).
The API synchronizes game settings and the child's Daily Plan. This batch also
requires the matching shared child policy helpers for midnight closing and the
signed today-only schoolwork bypass; include it in the next authorized batch.

Verified locally:
- Eight focused website tests: Games bridge, Daily Plan, PWA network behavior and
  parent assistant bridge authority. Authentication and same-origin checks remain.
- ESLint of the bridge and TypeScript no-emit check.
- Production Next.js Webpack build.
- Isolated Electron fixture using actual served parent styles: all eight fictional
  children saved, footer usable at 320x568, 390x844, 390x440 and 1200x800, no dialog
  horizontal overflow.
- Visual review of out/game-settings/parent-mobile.png.
- Only the game JS/CSS were copied byte-for-byte from cloud source. The separate
  Daily Plan editor received its narrow midnight-input change, preserving existing
  website differences.

Ignored evidence: out/game-settings/build.log, source.json and parent-mobile.png.
No live household settings were changed by the test fixtures.

Published parent source: dc2e256. Deployment: dpl_HUWpbiyPGo3rGG3xNdmP6eVpNYHB.
Matching API: dpl_F4AiEUNXqEgn11VRzmC37DKS5La7.
Live Games JS/CSS, Daily Plan and workspace assets match verified source.
The signed child update/recovery feed and Windows download are version 1.2.306.
See the cloud repository docs/cloud-release-1.2.306.md for all artifact hashes.
