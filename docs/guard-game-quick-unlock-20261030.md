# Family Game Room quick unlock — October 30, 2026

Prepared locally on codex/release-310, base 6c1059b; not deployed. Depends on the
new parent-only game-unlock computer command in the BodeeGuard API. Deploy the
API first, then this parent dashboard. No database migration is required. The
current Windows release already consumes dated temporary Games permissions.

Parents can choose Family Game Room in a child's Quick Unlock dialog even when
Games is not assigned, use the overview shortcut, or click Unlock today in that
child's Family Game Room card. Restore usual rules removes the exception. The
unlock expires at family-local midnight; limits, chores and computer locks are
preserved. Additional time and permanent settings have separate controls.

The game tab keeps independent per-child pending/results, confirms the target
child and state, ignores stale reads across saves, and clears outdated success
text after expiration or a later parent change. An override blocked by chores
still shows Restore usual rules without falsely claiming games are available.

Shared source files were compared with their cloud HEAD before selective sync.
The website-owned workspace was edited in place; recent document features were
preserved. The route replaces an already-versioned generated workspace script,
ensuring that new imports load after deployment.

Validation:

- node --test tests/guard-game-settings.test.mjs tests/guard-workspace.test.mjs:
  64 pass, including authenticated/origin-checked bridge forwarding and current
  bundle selection from already-versioned generated HTML.
- npm run build -- --webpack: pass (final follow-up changed only the static game
  UI's status reconciliation and its fixture; no Next source changed afterward).
- Isolated real game-tab fixture jOyvKu: per-child unlock/restore, sibling actions
  while one save is held, duplicate click suppression, stale room read, failure/
  retry, retained chore block, midnight status expiration, unchanged permanent
  settings and existing eight-child settings save. Layouts 320/390/1200px and
  short-screen dialogs pass.
- Isolated actual Quick Unlock workspace with these website assets: avlNpO;
  fully painted visual capture: ECLtAA. Includes absent Games assignment,
  overview restore and 320/390/1200px layouts. Synthetic screenshots reviewed.
- Cloud/API full-stage results are recorded in the BodeeGuard repository's
  docs/cloud-game-quick-unlock-20261030.md. No family data was changed.

Local logs: .tmp/game-unlock-parent-tests.log,
.tmp/game-unlock-parent-build.log. Browser logs are in the cloud worktree:
.tmp/game-unlock-parent-electron-final.log, .tmp/game-quick-unlocks-website.log,
.tmp/game-quick-unlocks-capture.log. Preview: out/game-settings/quick-unlock-mobile.png.

Normalized source hashes (trimmed LF text):

- `app/guard/dashboard/workspace/route.ts`: `1c00b776e69e05481258f8f5692550715094b510d6ddcad30f678d39b1c7300a`
- `public/guard-admin/cloud-workspace.js`: `dfcdf7c86beede26a05622151f393ac5cdbcb9b23e701e2e07aeecfb2b5ba09b`
- `public/guard-admin/cloud-control-queue.js`: `90c806591a77c155de1e4c8049686dcf1890b9d564b39e8adbad19673ccaf4d0`
- `public/guard-admin/cloud-monitoring.js`: `2f9051af0c13d22ea47ab88d9180d3fddb03e8cbb8ab17429a44e9e3a53a1e14`
- `public/guard-admin/cloud-games-ui.js`: `b235cc41e5dff70bf6bb7eb73997f1f5e0999ed4259974321fb8853a918af154`
- `tests/guard-game-settings.test.mjs`: `f0b4d56d0ae470125f07033c19d3f7e0865a1dd29e3fce9eb03830fff990fd30`
- `tests/guard-game-settings.electron.cjs`: `9545b681d2bf682ac095f8dcf34e405228b79de59ed97b4ff405604f1416224b`
- `tests/guard-workspace.test.mjs`: `952cdfd3535b5efa32c839805d46a48cd2e2ab5b5844148313c9a9e73fd51d81`
