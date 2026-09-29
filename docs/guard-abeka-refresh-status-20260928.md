# Abeka mixed lesson completion status — September 28, 2026

The reported parent screenshot contains combined Lessons 22 and 20 with a false
course result. Older child reports combined all lesson days into one boolean;
that value cannot recover which individual lesson was checked. The existing
1.2.263 child/parser-v3 release selects the earlier numeric lesson per course.
A fresh My Lessons Today report from that child is still required to replace
these older results. See cloud-release-1.2.263.md in BodeeGuard.

The dashboard and Daily school completion review now distinguish an ambiguous
mixed-day false result as waiting for a lesson refresh. Confirmed completed
courses retain their green checks, and a corrected child report removes the
waiting state automatically. Same-day multiple parts and genuinely unfinished
single lessons retain their existing completion meaning. Parent review decisions
remain authoritative. The presentation never fabricates completion from time,
changes a school record, or chooses a checked lesson from the merged boolean.

- BodeeGuard source: `57a51a3c8aebeaac465dc57ea74d127a6890a00e`.
- Website source: `e7b8c91c6c1b1d03de134770d3f5d210e5f6991d`.
- Deployment: `dpl_HDExLuxp6FGY2wvQMrkSTtrDwo5r`.
- Candidate: https://bodeebooks-q3xi32fp0-vexonastudios-3984s-projects.vercel.app.
- Public domain: https://guard.bodeebooks.com.
- Rollback: `dpl_Gpf1Q4UubXgvUwYJEZQ1qnt98QCj`.

Candidate and public release identities and all four normalized source hashes
were verified. The initial post-promotion release check saw the previous alias
before propagation; a subsequent fresh request and every changed asset matched.

- cloud-workspace-model.js: `b274e3d359dd2c4ed1ce84ca7c31640d9367bd3fb7ae5540f407ca956ac95af6`.
- cloud-monitoring.js: `8b1651fdd5e2bcf32e4f2bc46c059d2a15e502992e99d0c80b18a13ee69cded9`.
- cloud-school-review.js: `9440356deed183838a49f1c735e58249633db709cd5babaa1e1c2d30ffe3aec7`.
- cloud-workspace.css: `6947deb9643987d665c34c2569f68ec5a7f4e804bd780664fcaca310de2e09c6`.

Validation used synthetic data and isolated profiles:

- `npm run verify:change -- --area dashboard`: workspace/static/lint and all
  178 unit tests in 35 files passed. Startup, parent exit and notifications passed.
  The first workspace run hit a fullscreen-to-toolbar timing assertion in the
  unchanged child fixture. `node scripts/test-cloud-electron.js --suite
  workspace,admin` then passed both remaining scenarios without source changes.
  This is focused coverage, not a full suite pass.
- The monitoring Electron fixture passed with a mixed false report, a genuine
  completed neighboring class, phone/desktop/narrow-phone layout, then a fresh
  Lesson 20 completed report removing the waiting state. Screenshots were
  inspected at 390 and 320 pixels; the normal desktop/mobile fit also passed.
- Website workspace, family-readiness, dashboard and dashboard-refresh suites:
  79 tests passed. The clean Vercel production build and exact-source checks passed.

No child installer, API deployment or forced restart was needed for this parent
presentation change. The existing child release is 1.2.263. The reported child's
installed version and fresh provider completion acceptance are NOT verified.
Read-only household support access was unavailable; no live completion records,
family settings, messages or Abeka permissions were changed. Once the child is
on 1.2.263 or later, open My Lessons Today when the lesson has finished, allow the
stable scans to arrive, then refresh the parent dashboard.

Evidence: BodeeGuard `.tmp/verify-abeka-refresh-status.log`,
`.tmp/verify-abeka-refresh-electron-retry.log`,
`out/monitoring-preview/mixed-lessons-{desktop,phone,narrow-phone}.png`, and website
`.tmp/abeka-refresh-e7b8c91/` (clean archive, deployment/promotion logs, candidate
and public proofs). Receipt-only commits do not require another deployment.
