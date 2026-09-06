# Parent app address

The parent application uses `https://guard.bodeebooks.com`. The public product
introduction remains `https://www.bodeebooks.com/guard/`. Both belong to the
existing `bodeebooks` Vercel project, not separate application copies.

## Routing and identity

- Parent `/` serves the existing authenticated dashboard; `/account/`,
  `/activate/`, `/sign-in/`, `/sign-up/` and `/download/windows/` map internally
  to their original `/guard` handlers. Server actions and bridge requests retain
  their existing session, household and same-origin mutation checks.
- The physical workspace, assets and `/guard/dashboard/*` bridge endpoints stay
  on the current origin. Do not redirect background requests to another host.
- Clerk retains the same production application and `clerk.bodeebooks.com`
  frontend/issuer. No identity migration, new Clerk app, user recreation or key
  rotation is required for this same-root parent address. The public frontend
  environment accepts both the bookstore and parent origins.
- Clerk form paths reflect the request host. Sign-in defaults to the dashboard;
  newly registered parents return to their account/setup page.
- Cookie-authenticated API calls accept the exact production authorized parties
  `https://www.bodeebooks.com,https://guard.bodeebooks.com`. Do not add a wildcard
  or treat the browser hostname as household authority.
- The child's API remains `https://guard-api.bodeebooks.com/api`. This address
  change does not install, re-pair or migrate any computer or family database.

## Cutover and rollback

1. Deploy the verified source without promoting the bookstore domain, attach
   `guard.bodeebooks.com` to the same project and point only that alias at the new
   deployment. Keep `BODEEGUARD_APP_REDIRECTS_ENABLED` unset/false initially.
2. Verify HTTPS, the root/sign-in/account/dashboard routes, same-origin bridges,
   static assets, private no-store responses and anonymous rejection. Do not
   create a production identity or subscription merely to test navigation.
3. Once the new address responds correctly, set API `BODEEGUARD_ACCOUNT_URL` to
   `https://guard.bodeebooks.com/` and redeploy the existing API source. This sets
   newly generated pairing and Stripe Checkout/portal return links; it does not
   alter an existing subscription, payment or trial clock.
4. Set website `BODEEGUARD_APP_REDIRECTS_ENABLED=true`, deploy and promote.
   Old GET/HEAD account, sign-in, activation and dashboard bookmarks redirect to
   the new address. POST/PUT/PATCH/DELETE/OPTIONS are never redirected between
   origins. Pairing/billing query values survive; sign-in return destinations are
   normalized to known app pages and reject foreign origins and lookalikes.
5. Keep both API authorized parties during transition. To roll back, disable the
   redirect flag and redeploy the known-good site, then restore the API account
   URL to `https://www.bodeebooks.com/guard/`. Do not delete the Clerk app/domain,
   family records or devices to roll back a web routing change.

Bookstore analytics are not mounted on the parent domain or old `/guard` pages.
The public bookstore remains statically rendered where it was static before.
An already open older bookstore tab may have analytics loaded from that older
document; the new parent domain is a separate navigation/document.

## Verification

Run `node --test tests/guard-*.test.mjs`, `npx tsc --noEmit`, scoped lint and the
production Next.js build. Domain fixtures cover same-host rewrites, untouched
bookstore/assets, gated bookmark redirects, mutation preservation, hostile return
URLs, Clerk form paths and analytics exclusion. Anonymous live probes are not
proof of a completed parent login or a successful paid checkout; retain that
distinction when reporting acceptance.

## Cutover receipt — 2026-09-06

- Website source `6425f7f` built successfully and is live at deployment
  `dpl_9jD9HE2jrvGhzuMzFLBh8n9ES9SN`. The existing project serves the bookstore
  and verified parent domain; the production redirect flag is enabled.
- API deployment `dpl_34meoXUQe7LkuJ6pvjJjcJDyt5pU` redeployed the previously
  running API source with the two exact authorized origins and new parent return
  URL. No child API URL, Clerk keys, user records or subscriptions were changed.
- 35 unit/component tests, TypeScript, scoped lint and the production build
  passed. `node scripts/check-guard-domain.mjs` passed all 18 anonymous live
  checks after promotion. API health and the existing Clerk frontend returned
  200; the Clerk frontend accepts the new parent origin.
- Parent sign-in through an actual existing family session, payment flows and
  the future student installer remain separate acceptance tests. The script
  intentionally does not create users, pair devices or start payments.
- Source is backed up on `codex/cloud-parent-dashboard` in `bodeebooks`.
  That repository's `main` has an unrelated history; it was not overwritten or
  force-pushed. Existing uncommitted audiobook edits were excluded from this
  deployment and preserved in the original checkout.
