# Submitted document alerts — October 28, 2026

Implemented locally on website baseline edb1c562c44e447a075e256f613b78a0422d2c16, paired with the cloud API document notification change. Not deployed. Preserve the existing parent workspace; this was a selective update, not a full export from an older renderer.

## Parent behavior

A child paper submission appears in Messages with a direct Open document for review or printing action before its attachment preview. The action opens that exact private submission in Documents, where the existing review, print and grade controls remain available. Generic phone alerts explicitly describe a document awaiting review or printing; the existing optional name/message preview preference is retained.

Overview and Papers show a compact inline reminder and Documents/Papers navigation shows an awaiting-review count. Only ready, active child papers count. Reading the message or opening the document does not resolve the review request; marking reviewed or grading does. Previously submitted unreviewed papers are included after loading metadata, without resending old notifications. Phone layouts remain compact, without a new blocking dialog.

Metadata refreshes on startup, live message hints, live reconnect, return to the page and explicit review/navigation. There is no new interval or background poll. Private document bytes are fetched only when opened; hidden document cards are not rebuilt during live dashboard updates. Existing file access, retention, validation and notification settings remain intact.

## Verification

- 105 phone-notification, notification-reply and workspace tests passed, including document-specific private push copy, fixed conversation routing and the deployed import graph.
- Production build passed with npm run build -- --webpack. The default Turbopack attempt rejected the pre-existing dependency junction outside the worktree; no build configuration was weakened.
- Deployed runtime lint passed with two pre-existing warnings in unchanged message/workspace lines. Running the website TypeScript import-style rule against the existing CommonJS Electron fixture reports six existing require-import errors; the fixture is syntax-checked and executed with Electron instead.
- The isolated parent UI fixture covers live submissions, ready child-only counts, fresh-load discovery, exact private preview, literal filenames, touch-sized action, readable desktop/phone reminders, reachable printing, explicit review, persistent resolution and no idle metadata polling. Final captures and results are kept in the linked cloud receipt.
- Both the workspace entry and stylesheet/module cache versions are updated. The service worker is updated at its existing URL.

No production messages, accounts, records or notification settings were changed. API and parent website deployment are needed; existing child releases already upload this paper format and do not require a Windows update for the notification flow.
