# Four-character installer codes — November 3, 2026

The install entry form now accepts codes like `MKR7`: three letters and one digit.
It keeps accepting older pasted codes during their remaining 30-minute lifetime.
The issuance response validator accepts both formats so the website can be
deployed before the commercial API starts creating short codes.

The public redeem route still omits parent credentials and sends only the code
to the API. Installer eligibility, temporary signed links, download feedback and
independent computer pairing are unchanged. The API controls expiry, collisions
and the existing durable request limits; no migration is needed.

Validation: all 14 affected website code/download-feedback/account-journey tests
passed across the affected runs; production webpack build and targeted ESLint
passed. Tests include the real form's input/submit handlers, four-character
minimum, old-code compatibility, unauthenticated redemption and release selection.
API tests and the rollout order are recorded in the cloud repository's
`docs/short-installer-download-codes-20261103.md`.

Website base `997d2cf`. Prepared locally, not deployed. Publish this compatible
website first, then the API. No new Windows release is needed.
