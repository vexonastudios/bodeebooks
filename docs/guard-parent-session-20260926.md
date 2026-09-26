# Parent dashboard session recovery — September 26, 2026

Published to the existing parent website. A rejected background dashboard read
previously displayed “Your sign-in expired” immediately, even while the outer
parent page could renew a valid login. The dashboard now asks that page to renew,
waits for its trusted response, and retries the read once. Brief renewals stay
quiet; longer recovery shows a compact inline notice. Failed recovery offers
Try again without claiming that the parent signed out. A fresh authorized
snapshot clears the notice and restores controls.

The outer Clerk component redirects to sign-in only when Clerk reports signed
out and returns no token. Network failure or a missing token while signed in
does not force a redirect. The origin and iframe-source checks remain intact;
no token is sent through postMessage. Only GET reads can be retried. Parent
commands and message sends are never automatically replayed. Hidden-page,
timeout, abort and disposal paths cancel pending recovery.

## Source and publication

- BodeeGuard source: `614c847568122d7a574d0bab0518850fa33122af`.
- Website runtime source: `87f864742646c828089841dc129455ee7f6b2e22`.
- Both sources pushed to the official repositories on
  `codex/family-games-presence` before building.
- Live deployment: `dpl_GbKMGQuZFo5L5mka8M7HZGChuuAd`.
- URL: https://bodeebooks-l9x5hsva5-vexonastudios-3984s-projects.vercel.app
- Previous healthy deployment: `dpl_2ro1sUCnvi2nmt7Cno8Qop6RYokF`.
- Clean Git archive: website `.tmp/parent-session-20260926/`.
- Child download selection remains **1.2.241** at build and runtime. No child
  installer, update feed, commercial API, Cloudflare service or household data
  changed.

The two workspace implementations were patched separately to preserve the
website's existing overrides. The new recovery helper was copied exactly, added
to the Guard asset inventory, and recorded in the website export hashes. The
workspace script cache key was updated. The candidate production build, three
candidate assets and public installation page passed before promotion.

After promotion, the public dashboard release endpoint returned the ID above.
All changed public assets matched the clean archive and returned
`public, max-age=0, must-revalidate`; the old expiry sentence is absent from the
live workspace script.

| Asset | Live SHA-256 |
| --- | --- |
| cloud-parent-session.js | d1239e7895e5ac064760b8fed60d0e09b3f4f7bbff199bbd3f7489e584f9e0c9 |
| cloud-workspace.js | c6fbaa7f3a0b680f7cd08ffabfc8da6deb07f905d3c6fe9aa1ce9d3880ecde6b |
| cloud-workspace.css | 8bc1ca0c2a3b4b5bda8792fc803c3cffc8c00c5b9e20de359988384e6d2d9131 |

## Verification

- Guard `npm run verify:change -- --full` passed: workspace/syntax/lint,
  **1,960 tests in 384 files**, native protection checks, and **all 43 Electron
  scenarios**. Stage durations: 2.2s, 136.9s, 20.7s and 318.8s respectively.
  Log: `.tmp/verification/parent-session-20260926-full.log`.
- Five new helper regressions cover recovery, forged messages, repeated 401,
  timeout/network failure, hidden/aborted/disposed pages, and refusal to replay
  mutations. The official remote and clean-diff checks passed.
- Website reconnection tests: 9 passed, including actual signed-out state,
  signed-in state with no token, trusted authentication renewal despite the
  normal throttle, and untrusted-message rejection.
- Existing website workspace (49), dashboard refresh (8), parent updates (8),
  connect navigation (3) and visible viewport (1) tests passed. TypeScript and
  focused component lint passed; the production Next.js build passed.
- `guard-session-recovery.electron.cjs` reproduces 401 -> renewed login ->
  authorized snapshot using the exported phone dashboard in a real iframe.
  It checks neutral inline feedback, a repeated rejection, disabled/restored
  controls, manual retry, preserved unsent draft, no duplicate reads after
  success, no message sends and no horizontal overflow.
- Existing `guard-mobile-messages.electron.cjs` also passed. The recovery phone
  screenshot was visually inspected in `.tmp/session-recovery-phone.png`.

All runtime fixtures used fictional children and isolated profiles. The user's
actual phone session was not inspected; opening the update and observing the
next real mobile resume remains physical acceptance. An already-open parent
app needs its Update prompt or a reload to receive this release.
