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

## Popup and multiple unlocks

Published September 13, 2026. Source:
`0348100e1699a905af83597b7f8a1b6c330fa1aa`, branch
`codex/quick-unlock-popup` in `vexonastudios/bodeebooks`.
Deployment `dpl_6p4yADFfAqXEgFiWqQ3hWFSVJgsH` was built, then promoted to the
existing website domains, including `guard.bodeebooks.com`.

Quick Unlock now opens a centered native dialog with three activity columns on
desktop and two on phones. The list scrolls inside the dialog, keeping its title
and actions visible. Direct taps save individual activities without closing the
popup. Select multiple supports local selection, Select all, and Unlock selected.
Green checks represent confirmed saved unlocks, while pending saves and failures
have separate states. Existing No school requirement filtering remains in place.

The dialog lives outside rebuilt child cards, preserving its state and scroll
position across dashboard renders. Escape, Done, Close, and outside clicks dismiss
it; keyboard focus returns to the child card's opener. Save jobs retain their
original child and explicit unlock value even if the popup closes.

Multi-select serializes the existing authorized quick-unlock commands, one per
activity; it is not an atomic server batch. Successful items remain saved if
another fails, and retry submits only remaining failed selections. A later
authoritative response reconciles a lost acknowledgement. Same-day confirmed
responses update the cached unlock state without a redundant full Overview GET.
Other mutations and changed school dates retain the existing refresh behavior.
Authorization, family scope, daily expiry, and media limits are unchanged.

Verification:

- All 109 website tests passed, including family/child Daily Plan filtering,
  response validation, and execution of the actual workspace mutation function
  to verify refresh behavior and error handling.
- The isolated Electron fixture passed rapid taps, duplicate prevention,
  multi-select, partial failures, retry, lost acknowledgements, confirmed checks,
  background renders, scroll retention, keyboard dismissal, and popup bounds at
  1280×900 and 390×844. Synthetic desktop and phone screenshots were reviewed.
- Targeted ESLint reported no errors (two existing unused-variable warnings in
  the workspace); the final changed module and fixture passed without warnings.
  `git diff --check` passed.
- Vercel production build passed. All four deployed JavaScript/CSS assets match
  source after line-ending normalization. The live popup and selection controls
  were opened and visually verified without sending family unlock commands.

This remains a website-only update; the Windows release remains 1.2.222.
