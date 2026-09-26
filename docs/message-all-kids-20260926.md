# Message all kids — September 26, 2026

Published under the continuing release authorization. The cloud Messages page
previously offered only individual conversations. A visible Message all kids
entry now sits above search on both phone and desktop. It opens the existing
composer with the active recipient names, text, voice recording and attachments.
Each message goes to a separate child conversation; replies remain separate.
Archived profiles are excluded; offline children are included for later delivery.

## Delivery and retry behavior

Uses the existing authenticated per-child message and private-file APIs. There
is no new server authority, endpoint, group conversation or child contract.
Recipients, contents and distinct per-child message/upload IDs are frozen before
the first write. Sends are sequential, with visible per-child progress. The UI
only marks Saved online after validating the matching receipt; it does not claim
that the child has read the message. Confirmed recipients are skipped on retry.
Uncertain replies reuse the same IDs; attachments retain child-specific uploads.
Network-wide failures stop the batch promptly. Retry remaining is visible on
phones as well as desktop. A pending batch retains its draft across conversation
navigation and warns before page unload. It is not persisted across a forced
close; the parent is told to keep the page open until confirmed. Starting a new
message explicitly discards the local retry batch, not already-saved messages.

## Source and verification

- Guard source: `56f7f21b553b7c32f8c5026dc87f82b5138f9290`.
- Website source: `d91e0a837711d6e4264e238b086d6c169bd74478`.
- Both pushed to their official repositories on `codex/family-games-presence`.
- `npm run verify:change -- --area messages,dashboard`: static checks, 227 unit
  cases across 49 files and all seven selected isolated Electron scenarios
  passed. Includes voice recording, its 60-second limit, child notifications,
  individual-message retry and the existing parent/student workspaces. This is
  focused verification, not a full-suite claim. Stage times: 2.2s/9.4s/139.3s.
  Log: Guard `.tmp/verification/message-all-dashboard.log`.
- Final small presentation adjustment (visible retry button/clear old completion
  note) passed syntax, targeted lint, workspace/remote and diff checks. Both
  website browser fixtures below passed again afterward.
- Website `node --test tests/guard-workspace.test.mjs`: 49 passes.
- Existing `tests/guard-mobile-messages.electron.cjs` passed, preserving search,
  individual drafts, same-ID retries, pagination, attachments and phone layouts.
- New `tests/guard-broadcast-messages.electron.cjs` passed: active/archive filter,
  all recipients despite conversation search, no pseudo-recipient API calls,
  double-tap prevention, lost response after save, frozen recipients during
  retry, exact message IDs, separate histories/drafts, per-child attachment IDs
  and lost upload response, actual fake-device voice capture, offline recipients,
  phone/keyboard/landscape sizing and desktop visibility. Synthetic data only.
- Visually inspected `.tmp/broadcast-phone-list.png`, `broadcast-compose.png`,
  `broadcast-keyboard.png`, `broadcast-partial.png`, and `broadcast-desktop.png`.
- Source/export assets match with the existing relative-import transformation;
  only their two manifest hashes changed. Generated HTML and overrides preserved.
- Production build/TypeScript passed; candidate JS/CSS matched the clean archive.

## Publication

- Clean archive: website `.tmp/message-all-site-20260926/`.
- Deployment: `dpl_GoTHtRAjdBzqLdAhBuH17iMLscWq`.
- URL: https://bodeebooks-m8jxm31ze-vexonastudios-3984s-projects.vercel.app
- Previous healthy deployment (rollback): `dpl_EmBMTM8r36qrWDoBeWZPLmUecwwU`.
- Promoted after candidate checks. Public release identity matched afterward.
- Public raw SHA-256, matched to archived source:
  - `cloud-messages.js`: `8c2c41058278ae155f709e662341a3bbf52c2ca4b199269583718aea55c77f70`
  - `cloud-messages.css`: `778cd9b64a7b49273ac40a97b8f1b8837c67e9e45b58059ffafa88e60bea6b11`
- Both assets return `public, max-age=0, must-revalidate`.
- Existing Windows child/download remains 1.2.242, supplied at build/runtime.
  No API, Worker, installer, feed or installed family app changed.

No real family messages were sent by validation. The parent can Update/reload,
open Messages, choose Message all kids, compose and send. Real family delivery
and physical-phone acceptance remain for the parent to exercise.
