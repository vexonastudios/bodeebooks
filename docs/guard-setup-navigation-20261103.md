# Parent sign-in and connection navigation — November 3, 2026

The real parent workspace blocks popups. Both connection links in setup step 4
used `target="_blank"`, so clicking Get Windows installer or the pairing link
silently did nothing. They now use user-activated top-level navigation, which
the existing iframe sandbox permits. The account/download and pairing screens
retain their authentication and Continue setup return paths.

When no computer is connected, each child's next action now offers the installer
and pairing-code links directly. Once an unassigned computer exists, Assign a
connected computer focuses its actual student selector. The previous generic
Connect or assign button could only scroll to already-visible instructions.

The public marketing page now has a prominent Parent sign in link at the top.
Sign-in and account-creation links render in the initial HTML and do not wait for
Clerk client initialization. The account destination opens the existing account
when signed in, or its protected sign-in flow otherwise. Private routes still
require normal authentication. The public page no longer prefetches these account
routes through its call-to-action links.

One pre-change public HTML request completed in 0.34 seconds (first byte 0.31s),
but its initial markup contained no sign-in/create-account controls. This explains
the missing controls and removes that waiting point; it does not establish the
cause of every reported scrolling or device-specific slowdown.

Validation: 289 website unit tests covered by the full run plus the corrected
workspace asset-version expectation rerun; production webpack build and targeted
ESLint passed. Both isolated Electron connection fixtures passed. The new fixture
uses the production sandbox and clicks the actual links at desktop/phone sizes,
verifying top-level navigation, Continue setup, real assignment focus and zero
family mutations/popups. Desktop/phone screenshots are retained in
`.tmp/setup-links/`. No Windows app was installed or executed.

Source baseline: `2bd5697` on `codex/launch-trial-policy`. Setup/workspace scripts
and setup CSS use `20261103-connect2`. Deployment receipt follows after delivery.
