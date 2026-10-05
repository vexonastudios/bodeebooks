# Parent completion ring - 2026-10-05

The parent overview showed 5/5 (and 2/2) with a three-quarter ring. The count was correct. The SVG used a dash/gap of 100/100 and a 25-unit dash offset, leaving the final quarter empty. CSS already rotates the circle to start at the top.

The renderer now normalizes the circle to pathLength 100, draws the completed percentage and remaining gap, and uses the existing CSS rotation without a second dash offset. Progress is clamped to 0-100; zero completion has no colored round-cap dot. The count and school-completion rules are unchanged.

Cloud feature source: fa9caf19e13113a1b9e6359dffdd3e208ebf3476.
Parent feature source: 6c832078a030698c008e127a8f7a2f3316033ff7.
Only cloud-monitoring.js was selectively transferred to the website. Module and workspace URLs use 20261005-progress-ring1 to refresh browsers.

Validation:
- Isolated Chromium rendering of the actual ring helper and dashboard CSS: 5/5 and 2/2 colored all 360 sampled angles; 1/5 rendered a partial arc; 0/3 colored none. Preview at .tmp/ring-preview/preview.png; diagnostics fixture-M8d55F. Fictional counts and a separate temporary profile only.
- npm run verify:change -- --area dashboard passed static checks, 38 unit test files and all 5 selected Electron scenarios. Stage durations 3.0s / 9.7s / 69.4s. Focused pass, not a full-suite claim.
- Parent npm run build passed; git diff --check and official cloud remote check passed.

Publication: pushed source for the next parent website deployment. This task does not deploy the website, API or a Windows child installer. The preceding parent notification reply fallback also remains queued.
