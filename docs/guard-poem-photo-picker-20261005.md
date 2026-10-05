# Poem photo controls — October 5, 2026

The parent reported an unresponsive Take a photo control in the installed Android parent app. The prior camera/gallery controls were styled labels for hidden file inputs. Desktop Chrome at a phone viewport opened the old label's picker, so the exact physical Android failure has not been reproduced or confirmed.

The editor now uses real camera/gallery buttons. Their click handlers synchronously activate the appropriate native file input within the original gesture, reset its value for same-photo reselection, and show a fallback message if opening throws. Camera capture requests the rear camera; gallery selection accepts multiple JPG/PNG/WebP pages. Both buttons visibly disable while scanning or when the API reports scanning unavailable. Manual entry remains available. Cache keys change for Poems, its CSS and the importing workspace.

## Verification

- TypeScript and ESLint passed; three parent poem/shared-message route tests passed.
- The isolated Electron fixture uses a fresh profile, fictional child/poem, synthetic image, local HTTP and strict CSP in the same-origin iframe. Chromium chooser events verify camera and gallery activation and icon clicks; cancellation retains text; actual shared image encoding compresses a large PNG; a lost scan reply retries the same ID/images; reviewed title/author/line/stanza breaks and same-photo reselection work; busy/unavailable controls prevent opening; touch targets and width fit at 320/390/768 px.
- Fixture: tests/guard-poem-photo-picker.electron.cjs; screenshot: ignored .tmp/poem-photo-picker-20261005/mobile-editor.png.
- Cloud source: 515 unit tests in 105 selected files and 17 isolated Electron scenarios passed for learning,dashboard. This is focused verification, not a full suite or physical Android acceptance.

Publish the clean current parent source to the existing private Family Beta site, verify exact archived bytes before promotion and both public aliases afterward, preserving recent Messages, learning/assistant/account styles and the signed Windows 1.2.287 feed. No API, database or child-installer changes are required.

## Family Beta publication receipt

- Published and verified: 2026-10-05T15:34:53.215Z.
- Parent source: aa3ce589124eaab323f7dbe06620d7b01546b38a; matching cloud source: 5094d26844c51415253ce56f2f0820c274b29ace.
- Website deployment: dpl_FnHevWUyF3N6qCjgC91YyWZ2mgn6; previous healthy rollback: dpl_3LFW6RsnUP4kT8NKb85GNFB35wzy.
- Archive SHA-256: b19377d1a866f6dee16112fed017e3c0b49d7f3aa9b05cc647a35fe0d26b8d5c.
- Candidate and both guard.bodeebooks.com / bodeebooks.com aliases matched exact archived UI bytes and required workspace authentication. Current Messages, spelling/vocabulary/shared assignment, assistant and account assets were preserved.
- Poems JS SHA-256: 2109a8b82f5e09bada42940f39565f5b2dee4ef88d98b16a2dae2e1a2d473b92; Poems CSS: 212de908b1cbe843d44cf8747b24b79f07e2671f72d82ee16bbbcfc611dbbcd3; workspace module: a76321664fbb2d035903b4a924b04f42fc8f5eb9c9097f3f2a5d6463c18b303f.
- Windows 1.2.287 primary/backup feeds remained byte-identical with pinned-key signature verification: ca52950690e8bbe24dc5afbecac8f0f1325077ca7f729b2c46fae4d580bb3412.
- Full ignored receipt: .tmp/poem-photo-picker-20261005/publication-result.json in the parent checkout.

Live authenticated Chrome verification after publication: at 390 x 844, the actual camera button click opened a single-file chooser, and Enter on Choose photos opened a multi-file chooser. No files were selected or uploaded and no poem was assigned. The empty test editor was cancelled and the temporary viewport/tab were cleaned up. This confirms browser activation; physical Android camera acceptance remains unverified.
