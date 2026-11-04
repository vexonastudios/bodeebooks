# Installer download handoff — November 3, 2026

Published follow-up: this change is live in the [November 3 setup deployment](guard-release-1.2.341.md). The original preparation record below is historical.

The install page previously rendered a valid download link below the code form
without moving the viewport or focus. On shorter screens this made a successful
code submission appear to do nothing.

After a successful code redemption, the page now focuses the download anchor
without the browser's default jump, then centers it in the viewport. Smooth
scrolling and the brief button glow respect reduced-motion settings. A persistent
green outline, check icon and next-step instruction make the action visible after
the animation finishes. Ordinary renders do not repeatedly move focus. The
browser still starts the installer download only when the user chooses the link.

Verification:

- All 13 existing installer-code and download-feedback checks passed, with the
  form harness updated to exercise the new effects and reduced-motion behavior.
- Targeted ESLint and `git diff --check` passed.
- An isolated browser fixture rendered the real install page, form, download
  component and CSS with synthetic code redemption. At 1280×720 and 390×844,
  successful submission focused the download link and scrolled it fully into
  view; the phone layout had no horizontal overflow.
- Local screenshot: `.tmp/install-ready-preview/mobile.png`. No production
  account or installer was used for this UI check.

Prepared against website `914091ee30523f6a856a1eb46640e68654306867`.
Not deployed. This change needs only a website deployment; no API or Windows
release changes are needed.
