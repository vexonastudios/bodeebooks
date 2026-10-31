# Parent-approved Sites and local web apps — October 30, 2026

Publication follow-up: live in [Family Beta 1.2.339](guard-release-1.2.339.md). Preparation status below is historical.

Implemented locally on codex/release-310, base 6c1059b. Not deployed or pushed.
Existing pending Family Game Room controls are preserved. No family data changed.

Add activity now offers Site and Local web app directly. Website address is its
own required field; Description no longer doubles as an address. Parents select
children; default access is optional with no daily goal. Exact-site restrictions
are explained. Additional school domains and provider controls are unavailable
for these two types. Existing school and activity controls remain intact.
Workspace cache tag is 20261030-sites1. The editor and library imports carry it;
existing game controls cache tags are preserved.

Corresponding API and Windows behavior, compatibility and source evidence are in
bodee-guard/docs/cloud-parent-sites-20261030.md. Deploy API, then this parent site,
then Windows. Both new types require the updated Windows capability; old clients
retain ordinary school access but do not receive Site/local app entries.
A source change is not a deployment or Windows release.

Verification: 65 parent route/editor/game tests passed (out/sites-tests.log).
Production Next webpack build passed (out/sites-build.log). Later public JS field
and wording changes passed the real desktop/mobile Site flows and final unit
checks; no Next route change followed the build. Final browser fixture-wq7ppl
uses these website assets in an isolated profile with synthetic children. Mobile
and desktop captures in the cloud worktree .tmp/sites-ui were visually checked.
Git diff --check passes.

## Verified source fingerprint

SHA-256 over UTF-8, LF endings, trimmed trailing whitespace plus one newline:

- app/guard/dashboard/workspace/route.ts — 5536cea70c603d44543bfe0d13af873fc59b0ce37c5f189e2ea35aa1515c87af
- public/guard-admin/cloud-workspace.js — aa49c060f16fe8fd33d5ea72fd9f06888fba2c12246c116141edd570eb97a083
- public/guard-admin/cloud-activity-library.js — ecd350547c0ea3425406f9935943161b95270c76a32907d050ee83554a037b64
- public/guard-admin/cloud-school-editor.js — e3d3db05b574b9332556444ccd3b09589619a861fca008aec99f8b8ff5b5e7f4
- tests/guard-sites.test.mjs — 44a9c9c01563a2e63d107b59d80794ee20f1a6a42e368e2123290fd7324018d0
- tests/guard-workspace.test.mjs — c21e21709eba5c0cda603058671ddb052a5607be347c946147ab1b0bb1016466
