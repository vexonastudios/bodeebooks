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
and setup CSS use `20261103-connect2`.

## Production delivery

- Published source: `004b4cd77c138df8431166038096278a841c04fd`, backed up on the
  official website repository's `codex/launch-trial-policy` branch.
- Deployment: `dpl_8dPGrv4anixoKR4WVBpKT2sowM5Z`.
- Rollback: `dpl_3zYb9NTBvWCQgS5WWqqnkWNMbZ3a`.
- A clean tracked-source archive was built as a production candidate. Initial
  sign-in markup, exact setup JS, release identity and the installer's signed-out
  sign-in redirect passed before promotion. Both public aliases report the new
  deployment; all three changed JS/CSS assets match source after normalization.
- Live Chrome: the public Parent sign in button opened the demo parent account;
  Continue setup opened step 4; Get Windows installer navigated from the real
  sandbox to the account download section; Enter pairing code opened activation.
  The real customer installer downloaded from the account: 164185820 bytes,
  SHA-256 `e78cce4469c78915d6650ca6f9c267a113579faa5318ecd0ac955a5c501ac910`,
  matching the existing customer 1.2.339 release receipt. The browser download
  event watcher timed out, but the completed file and checksum independently
  confirmed success. The file was not run or installed.
- Desktop and 390px marketing layouts were visually checked. Live screenshot:
  `.tmp/setup-links-live-landing.png`. Candidate/build/check evidence is retained
  under `.tmp/setup-navigation-delivery/` (ignored).

No account settings or device assignments were changed. The download increments
the existing download metric. No API deployment, Windows release, installer
replacement or update-feed change was performed.
