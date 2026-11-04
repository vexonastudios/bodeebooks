# Trial request signing — November 4, 2026

The authenticated Start trial server action now signs the Vercel-provided client
IP, a timestamp and the authenticated bearer token with the server-only Clerk
secret. Only `/v1/account/trial` receives the extra headers. General account,
checkout, pairing and school traffic are unchanged. Browser-supplied network
hints are ignored; the authoritative header is `x-vercel-forwarded-for`.

Baseline: `ca7cc52` on `codex/launch-trial-policy`.

This source is not deployed yet. For the next requested release, apply the
additive API migration, deploy this website change, then deploy the corresponding
API enforcement. The old API safely ignores the signed headers; the new API
rejects unsigned trial requests, so do not reverse that deployment order. Both
services must use the same production Clerk secret. Roll back the API before
rolling back the website. No Windows release is needed.

The full implementation, live Clerk setting changes, privacy limitations,
HMAC-key rotation requirement and rollback notes are recorded in the API repo's
`docs/cloud-trial-abuse-protection-20261104.md`.

Validation:

- `node --test tests/guard-trial-context.test.mjs tests/guard-account.test.mjs`:
  22 passed, including unchanged account states, signed trial submission,
  untrusted-IP rejection and a visible retry after an API rejection.
- Scoped ESLint: passed.
- `npx next build --webpack`: passed TypeScript and all 82 generated pages.
  The default Turbopack build could not traverse this worktree's external
  node_modules junction; no production build configuration was changed.
- Existing authenticated tutorial account still opened normally after the live
  Clerk changes. No new account/trial or live billing mutation was performed.
