# Parent Coloring Studio previews — September 26, 2026

Published to the existing parent website. No child installer, API or Worker changed.

## Source and deployment

- BodeeGuard source: `ad40fc1943b2f108fe6708198e8089bdfd55d486`.
- Website source: `13be80557a5a40cd561fb988aced09e8eb1719bd`.
- Website deployment: `dpl_9XA8eH4PTq2WpLd1GDKwTNL3n22Z`.
- Candidate: `https://bodeebooks-norvn19g5-vexonastudios-3984s-projects.vercel.app`.
- Previous healthy deployment: `dpl_dFUJLiaoPyh4Sns7re1v1Dk176yU`.
- Both source commits pushed to their official repositories on `codex/family-games-presence`.

## Changes

Approval cards show a 600px-tall, uncropped preview beside the child's request,
sharing choice and approval controls. The visible review image upgrades from a
thumbnail to the original automatically; a failed upgrade keeps its thumbnail.
Saved pages use a larger 430px preview grid with lazy, cached thumbnail reads.
Enlarge remains available in a separate toolbar, leaving artwork unobscured.
Phones use full-width portrait previews, overriding the old mobile height cap.

Approved pages move immediately into the open saved gallery. Family and child
settings remain available in disclosures beneath the artwork. A pending action
stays disabled if a sharper image finishes loading, preventing duplicate clicks.

Export was selective: only Coloring Studio CSS/JS and their generated source
hashes changed. Existing hosted mobile CSS and other dashboard panels were kept.
No family approvals, deletions, sharing choices or settings were changed to test.

## Verification

- `npm run verify:change -- --area dashboard`: static checks, 167 unit/service
  cases and all 5 selected isolated Electron scenarios passed. Focused, not full.
- Final `npm run check` and official-remote workspace gate passed after keeping
  the mobile sizing override within the Coloring Studio stylesheet.
- Coloring Studio unit/service tests: 20 passed.
- Isolated synthetic desktop/390px phone fixture: large unobscured artwork,
  no horizontal overflow, visible review original reads, lazy saved thumbnails,
  Enlarge on demand, failed original fallback, duplicate approval prevention,
  transition to saved gallery and updated pending count passed. Rendered captures
  were checked using offscreen Electron; no installed family app was launched.
- Website workspace, dashboard and parent-update tests: 62 passed.
- Clean whole-repository deployment archive: Next build and TypeScript passed.
- Candidate release identity and script bytes verified before promotion. Live
  release identity matched after promotion with `no-store`; live CSS/JS exactly
  matched the deployment archive bytes.
- Signed-in live Coloring Studio was visually checked: clear, enlarged approval
  artwork beside controls, saved gallery below. Read-only; no family changes saved.

Local evidence (ignored): BodeeGuard `.tmp/coloring-layout-verify.log`,
`.tmp/coloring-layout-coloring-tests.log`, `.tmp/coloring-layout-fixture.cjs`,
`out/coloring-*.png`; website `.tmp/coloring-layout-site-tests.log`,
`.tmp/coloring-layout-deploy.log`, archive `.tmp/coloring-layout-site/`.

Child Family Beta remains 1.2.245. Open parent dashboards can use Update or refresh.
