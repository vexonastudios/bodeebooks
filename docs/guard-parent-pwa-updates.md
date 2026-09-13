# Parent PWA deployment updates

September 13, 2026 — source in `vexonastudios/bodeebooks`, branch
`codex/parent-pwa-updates`.

## Finding

The live parent HTML already used private/no-store headers. The service worker
did not cache family pages, assets, or API responses; mutable JavaScript and CSS
revalidated on navigation. However, an already-open PWA could continue executing
old JavaScript indefinitely. Resuming the app refreshed authentication and family
data without replacing the running application code.

## Behavior

- The build/dev script generates a SHA-256 identifier from shipped app source,
  parent assets, shared components, dependencies and configuration. The iframe
  HTML, outer React component and public version JSON use the same identifier.
  Source changes require no manually maintained release number. Text line endings
  are normalized so Windows and Linux agree; generated metadata is excluded from
  its own hash. Environment secrets and family records are not inputs or output.
- Visible launch/resume, online recovery, back/forward restoration, and the
  existing dashboard refresh check a 79-byte static version document. Checks
  coalesce, throttle to one per minute, abort when hidden, and time out after eight
  seconds. There is no new recurring timer, family API call, or database query.
  The public version document bypasses Clerk middleware explicitly.
- When the running code differs from the deployment, an untouched dashboard can
  reload the entire outer app. Any interaction in the workspace makes updating
  explicit for the rest of that page session, preserving drafts and avoiding
  interference with commands, uploads and recording. Open dialogs or playing
  media also prevent automatic reload. The mobile-friendly Update app banner
  remains available; after interaction, its confirmation reminds the parent to
  save/finish work before navigating. Cancelling retains their current page.
- Only same-origin messages from the actual workspace iframe can request an
  outer reload. Both iframe and outer-shell versions are compared. An open
  installation dialog or a backgrounded outer app defers automatic navigation.
- A sessionStorage attempt guard prevents repeated automatic reloads when an
  edge serves an old document or a rollout changes twice in quick succession.
  Unavailable sessionStorage falls back to the explicit Update action.
- Service worker registration uses updateViaCache:none and checks for worker
  changes alongside app checks, limited to once per five minutes while visible.
  Worker activation alone never blindly reloads an editing page. Navigation uses
  a no-store network request; authentication errors and offline handling survive.
- Mutable parent assets explicitly revalidate, while versioned game images retain
  their immutable caching. No cookies, localStorage, IndexedDB or family records
  are cleared, and the child update feed is unaffected.

An app page opened before this feature existed needs one real reload/reopen to
load the detector. Merely hiding and showing that old page cannot retrofit new
JavaScript. This does not require clearing site data or reinstalling the PWA.
Offline devices receive changes once they reconnect and open/resume the app.

## Verification

- All 119 website tests passed. Focused tests were rerun after the final React
  lifecycle adjustment. Coverage includes visible-only checks, throttling,
  concurrent requests, aborted/stale responses, malformed/offline metadata,
  draft-safe updates, same-origin messages, shell version mismatch, reload-loop
  prevention, deterministic build generation, and private navigation behavior.
- The isolated Electron browser fixture passed an actual open-page deployment
  transition, one full reload, draft preservation, cancel/confirm, and full-app
  navigation through the production iframe sandbox. Banner and touch target
  bounds passed at 1280×900 and 390×844; the phone screenshot was reviewed.
- Targeted ESLint passed for the changed implementation/tests. The workspace
  retains two pre-existing unused-variable warnings. A production Webpack build
  passed locally. Local Turbopack cannot follow this checkout's existing external
  node_modules junction; the hosted deployment uses its own installed dependencies.

Physical home-screen iOS/Android acceptance remains a device check; the browser
fixture does not claim to simulate all mobile OS lifecycle behavior.

## Deployment receipt

Source `b125dcc`, deployment `dpl_D7wvmGZ52DDTxp1XxDVTFpfk9wfW`, was built with
the hosted production settings and then promoted to the existing domains,
including `guard.bodeebooks.com`. The hosted production build passed.

App identifier:
`31f5550e46345e39e944ff2ede13b94d34e7c5c521feaeee5b19c29e3509cd0b`.

Live checks confirmed exact deployed source contents and revalidation headers for
the version document, service worker, manifest, update module, update stylesheet
and main workspace module. The signed-in live dashboard iframe reports the same
identifier, has exactly one update control targeting the outer page, and correctly
keeps the banner hidden because it is current. No update-module errors were found.
No family settings or commands were changed during verification. This deployment
does not publish a Windows child update; the installer/feed remain 1.2.222.
