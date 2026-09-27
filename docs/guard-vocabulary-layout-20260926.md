# Parent Vocabulary layout — September 26, 2026

Published to the existing parent website. No child installer, API or Worker changed.

## Source and deployment

- BodeeGuard source: `c521585ee0ae04264c2fe090cae57e57f8410056`.
- Website source: `aee516b67cbeeea13c72a9b848f49e2d4b4d6916`.
- Website deployment: `dpl_dFUJLiaoPyh4Sns7re1v1Dk176yU`.
- Candidate: `https://bodeebooks-oz836w2nw-vexonastudios-3984s-projects.vercel.app`.
- Previous healthy deployment: `dpl_Fie17FR3VmNEGbcUvA4aGYB47vn5`.
- Both source commits pushed to their official repositories on `codex/family-games-presence`.

## Changes

Constrained page width and readable type; child summary buttons filter received lists;
independently sized cards show colored stage counts, test readiness and review-word chips.
Word progress expands into meaning, recall-day and context rows, with a phone layout.
A single mastery guide replaces repeated explanatory notices. Explicit Edit list buttons
prevent accidental editing while inspecting progress. The editor uses larger fields,
multiline definitions, optional-detail disclosures, sticky actions and keyboard dismissal.
The unavailable scanner is no longer presented as an enabled action.

Learning rules, cloud commands, source text, retry IDs and history retention are unchanged.
Export was selective: only Vocabulary CSS/JS and its generated panel were replaced;
all other hosted dashboard markup was preserved. No household records were edited.

## Verification

- `npm run verify:change -- --area dashboard,learning`: static checks and 436
  unit/service cases passed. First four selected Electron scenarios passed, then the
  parent fixture caught a generator boundary excluding the new progress helpers.
- Corrected the boundary, regenerated and verified the exact export; `npm run check`
  passed on final code. Ten directly affected parent/export unit cases also passed.
- Remaining 12 selected Electron scenarios all passed, including parent create/edit,
  lost-reply retry, received learning, and archive preservation (16 selected total).
- Isolated synthetic layout fixture: desktop and 390px phone captures, independent
  card heights, child filtering, selected-child creation, optional fields, word
  disclosure, no horizontal overflow and Escape dismissal passed. No commands sent.
- Website: 62 workspace, dashboard and parent-update tests passed. Four old server-page
  fixtures were repaired to model the already-shipped client workspace boundary and
  Parent password label; no related runtime code changed.
- Clean whole-repository archive build: Next compilation and TypeScript passed.
- Candidate release identity and script bytes verified before promotion. Public release
  identity matched after promotion with `no-store`. Live Vocabulary CSS/JS exactly
  matched deployment archive bytes; checkout comparison also matched after CRLF
  normalization (Git archive applies repository line-ending attributes).
- Signed-in live Vocabulary page loaded successfully and received summaries/list cards
  were visually checked. Parent UI state only; no family changes saved.

Local evidence (ignored): BodeeGuard `.tmp/vocabulary-layout-*.log`,
`.tmp/vocabulary-layout-fixture.cjs`, `out/vocabulary-*.png`; website
`.tmp/vocabulary-layout-site-tests.log`, `.tmp/vocabulary-layout-deploy.log`,
clean deployment archive `.tmp/vocabulary-layout-site/`.

Child Family Beta remains 1.2.245. Existing open dashboards can use Update or refresh.
