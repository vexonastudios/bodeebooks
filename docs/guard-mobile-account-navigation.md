# Mobile parent account and child setup navigation

The phone dashboard previously hid the desktop account footer and offered only a
small Account link in its header. More did not include the account destination.

The header now says Parent account with a 44px touch target. More starts with
Set up a child computer and Parent account, with Lucide icons and explanatory
labels. These links open the existing authenticated account page outside the
workspace frame. Computer setup opens its existing connect step; no permissions,
pairing, installer eligibility or family records are changed by these links.

The same narrow change is preserved in the maintained BodeeGuard mobile source.
Only the two changed mobile assets and their hashes were selectively exported;
other differences between the deployed website and source were preserved.

Validation before publication: 49 website workspace tests passed. The isolated
phone fixture passed at 390px and 320px with no horizontal overflow, visible icons,
44px or larger touch targets and correct top-frame destinations. Desktop still
hides the phone header and displays its original sidebar. No child installation
or enrollment occurred. Deployment and live navigation verification follow below.

## Published September 26, 2026

Source: dfcdd01 (website); maintained dashboard source: dbf75a5f.
Deployment: dpl_22ZzVVZtkfJkPVv6G2B6r1cytLZj,
https://bodeebooks-k8i20rdrg-vexonastudios-3984s-projects.vercel.app.
Both candidate mobile assets matched the reviewed commit exactly. Production
build and TypeScript passed; promotion and live-domain asset checks succeeded.
The authenticated live dashboard at 390px showed both links and the new header.
Tapping Set up a child computer navigated the top page to /account/?setup=connect
and displayed Connect a child computer. Viewport override was reset afterward.
The family installer remains 1.2.240; no child device was installed or paired.

The maintained-source focused run passed static checks and 164 selected unit
cases. All five required Electron scenarios passed across resumed runs. An
initial notification timeout and transient admin renderer failure cleared on
isolated retries (the unchanged admin baseline also passed). This was focused
verification, not a new full-suite run.
