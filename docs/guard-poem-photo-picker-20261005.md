# Poem photo controls — October 5, 2026

The parent reported an unresponsive Take a photo control in the installed Android parent app. The prior camera/gallery controls were styled labels for hidden file inputs. Desktop Chrome at a phone viewport opened the old label's picker, so the exact physical Android failure has not been reproduced or confirmed.

The editor now uses real camera/gallery buttons. Their click handlers synchronously activate the appropriate native file input within the original gesture, reset its value for same-photo reselection, and show a fallback message if opening throws. Camera capture requests the rear camera; gallery selection accepts multiple JPG/PNG/WebP pages. Both buttons visibly disable while scanning or when the API reports scanning unavailable. Manual entry remains available. Cache keys change for Poems, its CSS and the importing workspace.

## Verification

- TypeScript and ESLint passed; three parent poem/shared-message route tests passed.
- The isolated Electron fixture uses a fresh profile, fictional child/poem, synthetic image, local HTTP and strict CSP in the same-origin iframe. Chromium chooser events verify camera and gallery activation and icon clicks; cancellation retains text; actual shared image encoding compresses a large PNG; a lost scan reply retries the same ID/images; reviewed title/author/line/stanza breaks and same-photo reselection work; busy/unavailable controls prevent opening; touch targets and width fit at 320/390/768 px.
- Fixture: tests/guard-poem-photo-picker.electron.cjs; screenshot: ignored .tmp/poem-photo-picker-20261005/mobile-editor.png.
- Cloud source: 515 unit tests in 105 selected files and 17 isolated Electron scenarios passed for learning,dashboard. This is focused verification, not a full suite or physical Android acceptance.

Publish the clean current parent source to the existing private Family Beta site, verify exact archived bytes before promotion and both public aliases afterward, preserving recent Messages, learning/assistant/account styles and the signed Windows 1.2.287 feed. No API, database or child-installer changes are required.
