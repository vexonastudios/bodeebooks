# Short child installer download codes — September 26, 2026

The parent account now leads with **Create download code**. On the child PC,
open `https://guard.bodeebooks.com/install/` and type the ten-character code.
It works for 30 minutes on multiple child PCs. No email or parent website sign-in
is needed on those computers. The installer still requires separate parent
pairing approval and assignment to an existing child profile.

The API creates a cryptographically random code after authenticating the parent
and checking the existing installer entitlement/channel boundary. Only a SHA-256
hash and short-lived installer descriptor are stored. No parent token, personal
records or signed URL is stored in the grant. Expired grants are purged at the
next issuance; family deletion cascades to its grants. Persistent database limits
bound issuance and public guesses across serverless instances. Guesses never
return family identity. The website accepts only the API descriptor and builds
an exact allowlisted catalog URL or signs the currently configured internal
installer for five minutes. Code input is POST-only and never in URLs/analytics.
The private installer is still private; no public release or enrollment gate
has changed. Version remains 1.2.240.

Validation: 39 website account/domain/download/code tests and TypeScript passed.
Account fixture loader was stale after previously added nested setup components;
it now renders those components and checks current copy, retaining entitlement,
operator-only invitation and one-active-child counting assertions.
Candidate build and live acceptance receipts follow after publication.

## Previous link-sharing implementation (historical)

# Download on a child computer without parent browser sign-in

Parent Account > Connect a child computer now offers a shareable installer link.
For the existing private Family Beta this is the same five-minute HMAC-signed
asset download used by the Download button. Public channel releases retain their
exact account-selected release URL and do not falsely claim an expiry.

POST /guard/download/windows requires the authenticated parent, an exact same-origin
request and current server-side entitlement/release selection. Caller-supplied
versions, URLs, family IDs and child IDs are unused. The response is private/no-store
and contains only the selected installer URL, version and optional expiry. No
computer is approved, credential issued, child assigned or family record exposed.
The existing child pairing screen remains the explicit approval boundary.

Parents can copy the link, or download once and reuse the same EXE using a USB
or existing shared folder. The UI clears expired links, handles denied clipboard
access with a selectable field and explains approving from the parent's own device,
assigning an existing profile and finishing Parent password setup if prompted.
No LAN server or new installed parent application is introduced.

Validation: 13 focused download/parent-journey tests passed, including same-origin,
signed expiry, auth/access rejection, input tampering, legacy/wrong-channel rejection,
public-channel behavior and unchanged download redirects. Changed route/component
ESLint passed; Next.js production webpack build and TypeScript passed. No child app
was installed, enrolled or restored during development. Publication follows below.

## Published September 25, 2026

Source: 335d097bf43a1cd144f81d56da8db6b60dc47d97. Hosted build and TypeScript passed.
Deployment: dpl_97b6Hx71DhNaTtZF4FnCCnPxvKhj,
https://bodeebooks-dqoxz8wv2-vexonastudios-3984s-projects.vercel.app.
Candidate anonymous POST returned 401. The live authenticated Parent Account
showed the new steps and generated a signed installer-only URL for 1.2.240 with
a verified remaining lifetime below five minutes. No signed URL or credential
is retained in this receipt. Reload clears the temporary UI link. The candidate
check also caught and corrected a trailing-slash redirect before publication.

Previous production: dpl_CQphL32gkWwnWrm4pf8Fg21dEm8J. No API deployment, child
artifact/feed, physical installation, enrollment, restore or backup opt-in changed.
