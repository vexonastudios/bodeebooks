# Abeka parent assessment shortcut — September 28, 2026

Parent website feature; no child installer, API, database or update-feed change.

## Behavior

- Controls/Overview shows **Abeka test unlocks** for a family with an active
  Abeka school assignment or an active child's Abeka main-school profile.
- The fixed link is https://athome.abeka.com/Account/Students/AssessmentPermissions.aspx.
  It opens as user-activated top-level navigation, including from the existing
  sandboxed dashboard and mobile PWA. Abeka owns the parent login/session.
- Students > Abeka parent tools keeps the same link and a checkbox to hide the
  overview shortcut on this device. The optional preference survives reopening;
  it is browser presentation state, not a cloud accreditation or school policy.
- Current profiles have no accreditation field. The shortcut defaults on for
  Abeka families, with explicit accredited-student copy and a way to hide it.
  Families without an active Abeka assignment/profile do not see it.
- Children being offline does not disable the parent link. It never changes an
  assessment lock by itself or asks for provider credentials in BodeeGuard.

## Validated source and publication

- BodeeGuard source: `99960cef1c6729134504444d5aacb01b49e1b11e`.
- Website source: `fff18015f603b1454d19bdd5bf14f9afabd8136b`.
- Deployment: `dpl_CNc3tVx254tKP7grzskvdthGwcET`.
- Candidate: https://bodeebooks-otaw8024u-vexonastudios-3984s-projects.vercel.app.
- Promoted on the existing project; public https://guard.bodeebooks.com verified.
- Previous healthy deployment: `dpl_ByPFC5APoyUkU2RabrwSp49LkfRK`.
- Existing installer version remains **1.2.263**, supplied at build and runtime.

Candidate and public normalized SHA-256 values match the reviewed source:

| Asset | SHA-256 |
| --- | --- |
| cloud-abeka-parent.js | 10fc7c379ccfa14856bddad84aa0d74f180646ee5b2d0a469017960dfd1051c8 |
| cloud-monitoring.js | 6f19b4f66afa09b81b85080bccfbace58f7959c577aa3f06b3b13f98418cc40d |
| cloud-monitoring.css | e74416ea7ad270384b85d49788f8241c711c84e532ca6f3a65d7f868ca2667a7 |

## Verification

- `npm run verify:change -- --area dashboard`: workspace/package, syntax/lint,
  **177 unit tests in 35 files**, and **5 isolated Electron scenarios** passed.
  This is focused coverage, not a new full-suite pass.
- `node --test tests/cloud-abeka-parent.test.js`: **2 tests** passed, covering
  active/archived assignments, provider profiles, disabled/absent settings and
  misleading or invalid school URLs.
- `node scripts/run-electron-fixture.js scripts/test-cloud-monitoring-electron.js`:
  passed on the final fixture. Checked retained monitoring actions and lesson
  labels, hide/reopen/show preference, offline children, no-Abeka visibility,
  1700/390/320-pixel layouts and user-activated navigation through the actual
  parent iframe sandbox to the exact official permissions URL.
- Website: **63 tests** passed across guard-workspace, guard-parent-pwa,
  guard-school-setup, guard-dashboard and guard-monitor test files.
- Clean Git-archive Vercel production build passed (21 seconds); candidate and
  public release IDs plus all three changed assets were independently checked.
- Visual captures inspected at desktop, phone and narrow-phone widths. Evidence:
  BodeeGuard `out/monitoring-preview/abeka-{desktop,phone,narrow-phone}.png` and
  `.tmp/verify-abeka-parent-dashboard.log`; website
  `.tmp/abeka-parent-shortcut-fff1801/` contains the archive, deploy log and proofs.

## Provider acceptance limits

The public signed-out permissions URL redirects to login.abeka.com; its login
response sends `X-Frame-Options: DENY`, so embedding the login is unsupported.
The shortcut uses the protected destination and leaves authentication redirects
to Abeka. No authenticated provider login or real assessment unlock was performed.
Physical mobile/PWA login-to-permissions acceptance remains unverified. Existing
Chrome automation was not retried while the extension-UI restriction remained.
All browser fixtures used synthetic families and blocked external navigation.
