# Staff usage and economical health monitoring — October 12, 2026

The existing `/guard/admin/` Usage & costs tab now includes daily selectable trends and figures, active-family normalization, completed-day comparisons, optional shared daily watch limits, and explicit data/billing coverage. The existing feature/family tables, provider Neon readings, error warnings and staff design remain in place. Range dates use UTC and include today's partial day.

These views reuse existing BodeeGuard hourly counters. Changing graph metrics and sorting do not fetch. Usage refreshes only on entry, filters or the Refresh button. Service Health stops browser checks while hidden, unfocused or idle for two minutes; it refreshes after returning. Server health probes are unchanged.

Watch limits warn at 80% and 100%, are saved for all authorized staff, and never disable family services. There are no preset limits: choose appropriate daily usage targets after observing normal traffic. Blank disables a warning. Saving is revision checked. No email, paid monitoring product, new provider credentials or new child telemetry is introduced.

Cloudflare and Vercel billing totals are not imported. Their provider pages are linked, and app database query counts are explicitly distinguished from Cloudflare rows read. Neon has its existing hourly provider cache. AI spending remains an estimate.

## API dependency / release

Companion source: `C:/Projects/worktrees/bodee-guard/headset-reconnect/docs/cloud-staff-usage-20261012.md`.
Apply its additive watch-limit migration before deploying the API, then deploy this website through the existing release process. No child installer is needed. This feature has not been pushed or deployed.

## Validation

- Eight focused UI/idle unit tests passed, including a synthetic twelve-hour idle period without extra network checks.
- The real components passed an isolated Electron fixture at 320, 390, 768 and 1440 px: graph switching without requests, shared-limit save and reload, family filtering, hidden global limits during drill-down, outage display and recovery.
- Changed-file lint and TypeScript passed. Production webpack build passed. The default Turbopack build encounters the existing external `node_modules` junction limitation in this worktree; no production setting was changed to work around it.
- Synthetic desktop/mobile screenshots were visually inspected: `.tmp/usage-dashboard-ui/staff-usage-desktop.png` and `staff-usage-mobile.png`.
- Full companion API verification is recorded in its handoff document. No production data was changed or used in the fixtures.

Companion API feature commit: `557ff800` (`codex/headset-reconnect`). The matching source passed the full API verification path: 2,527 unit tests, native protection and all 51 Electron scenarios, plus the final six-test usage-insights suite. Deploy the additive migration and that API before this website feature.
