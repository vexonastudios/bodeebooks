# Family Beta 1.2.244 publication

September 26, 2026. Website source: `a486bcd7c1e6033704592408dd113824a19fdd6a`.
Only parent release-note data changed; existing dashboard assets were preserved.
The production installer variable was persisted as 1.2.244 and supplied at build
and runtime from the clean `.tmp/music-site-244/` Git archive.

- Account/download tests: 25 passed; clean Next build and TypeScript passed
  (8.3s compilation, 7.2s TypeScript).
- Promoted deployment: `dpl_CgxDB84v6NPznboJDikm2DKqzVUz`.
  https://bodeebooks-1y84am9of-vexonastudios-3984s-projects.vercel.app
- Candidate and promoted public release identities matched. Public release response
  uses `Cache-Control: no-store`.
- Refreshed signed-in parent account visibly showed **Family Beta updates ·
  Version 1.2.244**; no account changes or child installation were performed.
- Previous healthy deployment: `dpl_2zD6d16v6knJv1ynMZVKcGy25euK`.
- Evidence: `.tmp/music-244-website-tests.log`, `.tmp/music-site-244-deploy.log`,
  `.tmp/music-244-live-website-verification.json`.

The cloud repository owns the signed child build, media API and full verification:
`vexonastudios/bodee-guard`, source `bfed8a3d04d86dccd312bc321fbeb149f9ddbcf7`,
receipt `docs/cloud-release-1.2.244.md`. Both complete hosted installer hashes and
the live signed beta feed were verified before completing this release. Existing
children still need to update before seeing the media changes.
