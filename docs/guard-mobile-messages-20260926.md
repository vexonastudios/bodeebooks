# Parent mobile Messages — September 26, 2026

Published to the existing parent website. Mobile Messages now shows a searchable
conversation list with initials and unread badges, or one full-height chat with a
Back button. The chat has compact timestamps, a bottom composer, attachment and
voice controls, inline voice playback, and no overlapping assistant launcher.
Help is folded away; notification settings use a labelled bell button. Desktop
keeps the conversation list beside the thread. Per-child drafts and exact-ID
send retries remain intact.

The source already contained a compact phone layout and inline voice player that
had not been exported to the website. This release includes those files and the
additional layout refinements. Five assets were transferred selectively; existing
generated dashboard markup and unrelated website overrides were preserved.

## Exact source and deployment

- BodeeGuard source: `60012e590335247bab327ebdeaff301ccdc32632`.
- Website runtime source: `b8466ed90516e62f5d4a7c3ca445cda3d1a18193`
  (includes layout commit `3aea26b5f5789e1a77bd371d84dd50b3a4aa9532`).
- Live deployment: `dpl_2ro1sUCnvi2nmt7Cno8Qop6RYokF`.
- Deployment URL: https://bodeebooks-d8cdiq5x7-vexonastudios-3984s-projects.vercel.app
- Previous healthy live deployment retained: `dpl_ADUtySRi5bVN5xpGS6T486on3BtK`.
- Clean deployment archive: website `.tmp/mobile-messages-20260926-final/`.
- Child installer selection remains **1.2.241**, at build and runtime. No child
  binary, update feed, commercial API or Cloudflare service was changed.

The protected candidate build and setup page passed before promotion. All five
changed public assets on `guard.bodeebooks.com` matched the committed SHA-256
hashes after promotion and returned `public, max-age=0, must-revalidate`.
The public dashboard release endpoint returned the deployment ID above.

| Asset | SHA-256 |
| --- | --- |
| cloud-messages.js | 3f2494fa871f8d606d6d3b945140e5779f8a3e939614cf391994ae4a19a3a616 |
| cloud-messages.css | 2b5fe1e8da2532e99f3b174bd6d057fdf0c253c993e699097717185b1d7f2c3a |
| cloud-file-tools.js | d05d149adc628d2709257c3b9abae855fd5b502fdb1cc8640e897c59ffc71894 |
| cloud-files.css | 5b1eca04e46540a90dd17493831c89e3170c1a131ccc912f16e0fa00ac964ccd |
| cloud-notification-navigation.js | a29c5dd260a9eb7621a684e93a67a898e310eb46768309963ca069a8f917bd73 |

## Verification

- Guard workspace/official remote, syntax and lint passed.
- `npm run verify:change -- --area messages`: all 20 unit files and startup/
  parent-exit scenarios passed. The Admin scenario exceeded the wrapper's
  45-second timeout; direct `electron scripts/test-cloud-admin-electron.js`
  completed successfully. Remaining `voice,messages` scenarios passed.
- The final website assets passed `test-cloud-voice-electron.js --site=...`:
  real recording/playback, inline lazy loading, uninterrupted receipt updates,
  private object-URL cleanup, same-ID retry, permission denial, Safari conversion
  and automatic 60-second recording limit.
- Website `guard-mobile-messages.electron.cjs` passed using nine fictional
  children: search/empty results, list-to-chat/back, draft isolation, exact-ID
  retry, history, attachment removal, navigation, four phone sizes (including
  320px and a 390x420 keyboard-height simulation), and desktop split layout.
- Viewport unit checks cover keyboard resize/pan, zoom, desktop and listener
  cleanup. Parent component/navigation tests load the actual new helper.
- Existing website workspace, notification reply, phone notifications, PWA,
  update, installer-code and connect-navigation tests passed. TypeScript and
  focused component lint passed. Production Next.js build passed.
- Synthetic screenshots are retained in website `.tmp/messages-*.png`; no real
  household messages, screenshots, enrollment or account changes were used.

The outer parent iframe now follows the phone's visual viewport because the
inner frame cannot observe the keyboard's viewport itself. Native phone keyboard
behavior was simulated and unit-tested; physical iPhone/Android use remains the
parent's next acceptance check. Reload the parent app or accept its Update prompt
for an already-open session to receive this website version.
