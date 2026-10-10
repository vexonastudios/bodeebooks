# BodeeGuard public product tour — 2026-10-10

## Scope and publication

Redesign of `https://www.bodeebooks.com/guard/` in the Bodee Books website.
Prepared locally for review; not deployed or pushed in this task. No child-app build, version bump, API deployment, GitHub Actions run, or family-record change is needed.

## What changed

- Replaced the drawn dashboard mockup with eleven real application and lesson captures.
- Added a visual walkthrough of the child dashboard, parent phone controls, Daily Plan, Bible reading/topics/memory/Horner plan, family messages and games.
- Added accessible screenshot enlargement using native dialogs (Escape, close button, focus return and background scroll lock).
- Added mobile layouts, section navigation, concise setup instructions, FAQs and page-specific social metadata.
- Kept the existing account/sign-in component and trial terms. Distinguished activity time from verified lesson completion; described connected-device and Windows requirements.

## Privacy and image provenance

**BodeeGuard family captures use synthetic data**, with Alex, Emma and Noah, initial avatars and fictional messages/progress. Bible and game captures contain no family identity. The separate Abeka lesson image is a crop of the screenshot supplied by the user for this public tour; only the lesson player is retained. The student dashboard, names, progress checklist and quizzes are excluded. Public copy distinguishes the fictional BodeeGuard family examples from the actual lesson view.

`public/guard-tour/` contains eleven reviewed WebP images (654,554 bytes total, about 639 KiB). Conversion crops the approved lesson region and resizes/compresses the original rendered captures and strips metadata; it does not paint over or invent app controls. Dimensions and sizes are recorded in `app/guard/tour-images.json`. Only the hero screenshot is preloaded; the rest load lazily. Enlarging an image does not connect to a child session.

Sources:

- `parent`, `parent-mobile`, `plan`, `messages`: real exported parent dashboard (`app/guard/dashboard/generated/workspace.json` and `public/guard-admin/`) served with fictional responses by `scripts/guard-marketing-preview.cjs`.
- `child`: actual `cloud-student.html` and student dashboard/planner/chores modules, initialized from the anonymous `scripts/test-cloud-student-day-electron.js` fixture.
- `bible-reader`, `bible-topics`, `bible-memory`, `bible-plan`: reviewed anonymous renders from cloud `.tmp/verification/bible/` (`bible-reader-desktop.png`, `bible-topics-sad-desktop.png`, `bible-memory-practice.png`, `bible-plan-desktop.png`).
- `games`: reviewed anonymous `.tmp/game-room-layout/child-family-games-top.png`, showing the real six-game catalog and shipped artwork.
- `abeka`: user-supplied `codex-clipboard-664922a0-766a-457f-8a28-31e4ecf5957c.png`, cropped from 2043×1621 to the lesson player at x=584, y=192, width=1265, height=809. The original screenshot is not copied into the repository. Abeka branding and copyright notice remain visible.
- Cloud source: `C:/Projects/worktrees/bodee-guard/student-today-dashboard`, commit `d4bdd6ad` (1.2.305 source state). Website baseline: `2ed1592`.

To refresh the sample family screens, set `BODEEGUARD_SCREENSHOT_SOURCE` to the cloud checkout and run `node scripts/guard-marketing-preview.cjs` from this website worktree. It binds only to `127.0.0.1:43919`, supplies invented records, blocks external connections with CSP, and has no production credentials. Open `/parent`, `/child` or `/games`. Use the app controls to select Daily Plan or Messages. Never substitute live family captures into the public assets.

## Verification

- ESLint on the page and gallery component; TypeScript no-emit check.
- Actual Next.js local preview, using Webpack because the worktree has a linked node_modules directory.
- Desktop and phone layout checks, including 390 CSS-pixel width; no horizontal document overflow.
- Real browser check of the original ten screenshot buttons plus the added Abeka player, lazy image loading, account link targets, section links and expandable FAQ.
- Native screenshot dialog: focus starts on Close; Escape and Close dismiss; focus returns to trigger; document scrolling restored.
- Visual review of screenshot contents, including names, messages, Bible views and game artwork.

Local preview uses `http://localhost:43920/guard/`; `localhost` is required by this environment's Next dev proxy routing. No authentication code was changed. Proof captures are in the task visualization directory as `bodeeguard-website-desktop.jpg` and `bodeeguard-website-mobile.jpg`.

## Abeka follow-up

Added Abeka to the hero and search description and as the first tour navigation item, with a dedicated section explaining the lesson toolbar, reported lesson progress and Daily Plan integration. The user supplied the desired lesson screenshot directly after account navigation was blocked by automatic approval review. The anonymous lesson-player crop is now included; no further account inspection was needed. The official public sample link remains included. The capture is accurately labeled as an Abeka lesson view, not a BodeeGuard fixture.

Final Abeka verification: focused ESLint and TypeScript no-emit passed; git diff --check passed. The player image loaded at 1440px desktop and 390px phone widths with no horizontal overflow. The enlarged screenshot displayed the correct Abeka source label and closed correctly. The final phone proof is saved as bodeeguard-abeka-mobile.jpg in the task visualization directory. No publication was performed.
