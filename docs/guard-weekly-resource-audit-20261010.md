# Weekly resource audit — parent changes, October 10, 2026

Local source only; no deployment or GitHub Actions run.

Parent baseline: `c35038b` on `codex/bible-family`.
Child/API baseline: `da4f805f` on `codex/student-today-dashboard`.

The complete measured audit and remaining scaling work are in the BodeeGuard repository at `docs/cloud-weekly-api-audit-20261010.md` (active checkout: `C:/Projects/worktrees/bodee-guard/student-today-dashboard`).

Changes in this website:

- Copied only `public/guard-admin/cloud-dashboard-refresh.js` from the child repository's `renderer/js/admin/` source. Automatic reopen events no longer repeatedly wake all computers within one minute; current snapshots and explicit Refresh remain available. Do not overwrite unrelated website assets with a full export.
- `app/guard/admin/UsagePanel.tsx` now displays per-feature rejected requests, database queries per request and mean latency; these values already exist in the API response. Added matching sort options and warnings for concentrated feature errors/rejections that the aggregate rate hid. No additional fetching or background polling.
- `tests/guard-usage-panel.test.mjs` exercises real component rendering with synthetic counters: concentrated audiobook failures, rejected diagnostic requests, expensive low-volume features and zero-traffic handling.

Validation: four rendering tests passed; `npx tsc --noEmit --incremental false` and focused ESLint passed. Child source tests cover the shared dashboard helper. This is a local source verification, not a live deployment or a measured reduction in production usage. Build/deployment and post-deployment checks remain part of the next authorized release.
