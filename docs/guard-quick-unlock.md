# Quick Unlock follows Daily Plan

Published September 13, 2026.

Source: `b52b3c88d1fe13d4420eff61b63800a90727a6a9`, branch
`codex/quick-unlock-daily-plan` in `vexonastudios/bodeebooks`.
Deployment: `dpl_922B9F1dHthYKD5Ua38gvV8iubeF`, promoted to the existing website
domains, including `guard.bodeebooks.com`.

The parent website's `public/guard-admin/cloud-monitoring.js` owns the live
Overview Quick Unlock menu. It now uses the existing Daily Plan model to exclude
assigned activities placed under **No school requirement** (`anytime`). Applied
family defaults are resolved through child assignments, with later individual
customizations taking precedence. Older optional-subject settings use the same
fallback as Daily Plan. Inactive and unassigned subjects remain excluded.

If no eligible subjects remain, the Quick Unlock menu is omitted. The change
does not remove activity/history rows, change rules, alter media limits, or
issue unlock commands automatically. The workspace import has a new version
query to load the updated monitoring module.

Verification:

- `node --test tests/guard-quick-unlock.test.mjs tests/guard-dashboard-refresh.test.mjs`:
  all 11 focused tests passed.
- `electron scripts/test-quick-unlock-electron.mjs`: an isolated loopback fixture
  passed at 1280×900 and 390×844, including filtered choices, no menu when all
  activities are anytime, the exact unlock command, and existing unlock state.
- Targeted ESLint: no errors; two existing unused-variable warnings in the
  unchanged workspace implementation. `git diff --check` passed.
- Vercel production build passed. Both deployed JavaScript files match the
  reviewed source bytes after line-ending normalization.
- The signed-in live menu was opened without changing any family rules. The
  nine No school requirement activities shown in the report were absent.

This is a website-only update. The child feed and account installer remain
1.2.222; no new Windows installer, API deployment, or household mutation was
needed. Unrelated edits in the primary website checkout were preserved.
