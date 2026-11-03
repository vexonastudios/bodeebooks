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

## Production delivery

Published November 3, 2026, from clean whole-repository archives. The website was
promoted and verified before the API began issuing short codes.

- Website source `b1fd245fbee276b747db33c7503e8d659c962480`, deployment
  `dpl_GfCoxcmHbCj73AwmHe5f6dbWF4Dr`.
- API source `23f5123e4d266a62103c7ee98e0c4fa74412583c`, deployment
  `dpl_SYd5nCxUgWczoxatMa9u84pq9iBr`.
- Candidate and public website checks verified the four-character minimum,
  `MKR7` example, help text and deployment identity. Issuance still requires sign-in.
- The Johnson tutorial account generated a live three-letter/one-number code with
  a 30-minute expiry. Entering that code in lowercase on the public install page
  returned the Windows 1.2.339 download link. No installer was run.
- Screenshot evidence: `.tmp/short-download-code-live.png`. No active code or signed
  download URL is retained in this receipt.

Rollback: API `dpl_DGCF3QQDhbH4C9BVXPPEtcYNPC3c` first; website
`dpl_8dPGrv4anixoKR4WVBpKT2sowM5Z` only after short codes expire. Website
implementation base was `997d2cf`. No new Windows release was needed or published.
