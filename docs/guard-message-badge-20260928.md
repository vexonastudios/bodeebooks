# Parent mobile message badge — September 28, 2026

Unread counts now overlay the Messages icon in red with white text. They do not
participate in button layout, change the label position, or increase navigation
height. Zero stays hidden; counts above 99 display as 99+. Other website mobile
styles were retained, including the original button height. The stylesheet URL
is versioned `20260928-badge1` so reopened parent workspaces fetch the update.

## Source and verification

- Canonical style: bodee-guard `29d15512c5ad3ee0d0014c5d12d1712c17be998e`.
- Website source: bodeebooks `daf3fa31d76a6bcb9c2599603eca1ecba8f58d8a`.
- `npm run verify:change -- --area dashboard`: workspace/static checks and all
  176 unit cases passed; startup, parent exit, notifications and workspace passed.
  The parent integration scenario timed out on unrelated synthetic Vocabulary
  rollback. `npm run test:cloud -- --suite admin` passed unchanged on retry,
  including that rollback. These are focused results, not a full-suite pass.
- Website `npm run test:guard-account`: 13 passed.
- Existing isolated mobile Messages fixture passed with temporary bounds checks
  for zero, 1, 2 and 99+ at 320, 390 and 430px. Button, icon, label and entire
  bottom bar bounds were identical across counts. Badge stays above the label
  and inside the tap target; screenshot visually inspected.

## Publication

Built a clean whole-repository archive under website
`.tmp/mobile-message-badge-release/site` in the existing BodeeBooks project.
Build passed. Candidate stylesheet exactly matched reviewed source before
promotion. Live `guard.bodeebooks.com` was checked at 2026-09-28T22:06:37Z:
release `dpl_3MipQHbBmPVnMoxksAUEaYRDwPFv`; stylesheet HTTP 200 and exact match,
UTF-8/newline-normalized SHA-256
`84b2729f97b5a799dbbda80668362a6f243ebad36e1ff5ad4f037d2ff9b56a15`.
Candidate: https://bodeebooks-8rljcvi3y-vexonastudios-3984s-projects.vercel.app.
The initial public read still served the previous deployment during propagation;
a subsequent release/stylesheet verification matched the candidate. Previous
healthy deployment retained: `dpl_HG1kq3pK1bajWJkNNJwxjyyXSXVW`.

Child download stays 1.2.262 at build and runtime. This website style fix does not
require a child installer, service deployment or family restart. Evidence is in
ignored `.tmp/messages-red-badge-*` and `.tmp/verify-message-badge*` files.
