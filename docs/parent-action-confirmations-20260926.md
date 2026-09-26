# Parent action confirmations — September 26, 2026

Published under the continuing release authorization. Parent website only;
Windows child remains 1.2.242. No API, Worker, installed app or family data changes.

## Behavior and cause

The central popup already had a timeout, but inline action results stayed in a
Map indefinitely and returned on every card refresh. Successful confirmations
now remain for 6.5 seconds, fade for 200 ms, and are removed from both the card
and retained state. Pending actions and errors remain visible. The button's
saved unlocked state is separate and remains unchanged.

Expiration is scoped to the exact result, so an earlier timer or late response
cannot remove a newer request. Card remounts and refreshes after tab suspension
cannot revive expired messages. The central popup also fades, keeps its hover
and keyboard-reading pause, and remains dismissible within modal dialogs.
Reduced-motion preferences suppress the transition.

## Source and validation

- Guard source: `63e400275d1a84e9683ac4210d84329e8c339167`.
- Website source: `34a63eeba24455e0a85bc51e72ae17274329798b`.
- Both backed up to their official repositories on `codex/family-games-presence`.
- `npm run check:workspace -- --remote` passed.
- `npm run verify:change -- --area dashboard` passed: static checks, 167 unit
  cases in 35 files and all five selected isolated Electron scenarios. This is
  focused verification, not a full-suite run. Stage times: 2.4 s, 8.2 s, 54.4 s.
  Log: Guard `.tmp/verification/action-feedback-dashboard.log`.
- Website `node --test tests/guard-workspace.test.mjs`: 49 passes.
- New `tests/guard-action-feedback.electron.cjs` passed with the Guard development
  Electron binary. Real DOM with fictional controls and an isolated profile:
  actual opacity transition, timed removal, remount/refresh, staggered actions,
  pending/error persistence, stale timers/results, keyboard pause, suspended tab,
  modal dismissal, reduced motion and phone layout. Its hidden window requires
  explicit focus events; it does not exercise a parent's physical phone.
- The shared script/styles match across repositories. Updated only the two
  generated manifest hashes; generated HTML and website-specific overrides kept.
- Production build and TypeScript passed. Candidate script/style hashes matched
  the clean source archive, and the installer landing page was available.

## Publication

- Clean website archive: `.tmp/action-feedback-site-20260926/`.
- Deployment: `dpl_EmBMTM8r36qrWDoBeWZPLmUecwwU`.
- URL: https://bodeebooks-46fnpx41v-vexonastudios-3984s-projects.vercel.app
- Previous healthy website (rollback): `dpl_4Pi5ZJbQKfaFNRLBCUSJ9u2dZBXk`.
- Promoted after candidate checks; the public dashboard release endpoint matched.
- Public raw asset SHA-256, verified against the archived candidate:
  - `cloud-action-feedback.js`: `73e33022a0e4ab1964019fa4ed0c67ebbc4ef0b5a98f3b8fd54c171ce06ed45d`
  - `cloud-monitoring.css`: `38f3b718dd72037f6de019779dbf0ca3e6a02ea78fa734ff4354dc0586ed6515`
- Both assets return `public, max-age=0, must-revalidate`. Installer version
  1.2.242 retained at build and runtime. No child release is required.

An already-open parent app needs Update or a reload to run the new code.
Physical family-device acceptance remains with the parent; no real unlock,
message, screenshot or family-setting mutation was made during verification.
