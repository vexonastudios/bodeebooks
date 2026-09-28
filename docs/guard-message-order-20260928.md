# Parent Messages navigation and ordering — September 28, 2026

Published source `58c5e796eaf7956950c1db9adc892479d851ff6a` on official `vexonastudios/bodeebooks` branch `codex/family-games-presence`.

The Messages list has a top-left 44-pixel back arrow to the previously used dashboard section, with Controls as the initial fallback. Conversations are ordered by the latest saved student message; reading or replying does not demote the newest student conversation. Search, active-child filtering, drafts, attachments and exact-ID retry are preserved. Website workspace logic was edited selectively.

All 193 guard unit tests, phone Messages integration and real iframe session-recovery integration passed. Production build/type checking and all 76 pages passed. Synthetic screenshot `.tmp/messages-list.png` was visually inspected. The reconnection test loader was corrected to resolve its existing TypeScript navigation dependency.

Deployment `dpl_5ft8ZchY1FtmcdSBTXDAvopyi8Zy`, https://bodeebooks-13w1z5py8-vexonastudios-3984s-projects.vercel.app, is live on guard.bodeebooks.com. Candidate/public release identities returned 200/no-store; all three changed assets exactly matched the clean archive before and after promotion. Clean archive `.tmp/messages-order-release/site`. Previous healthy rollback: `dpl_GfZzck4tzc7Hv3vtEYNvzuMSeT9y`, https://bodeebooks-g6xyxq1sk-vexonastudios-3984s-projects.vercel.app.

API support source `3d0e7058189cebfcbfdca275188cee499cfe7d48` is live as `dpl_2pEhYJjPw5TizAHJ9SSYpQcUDzR7`; it returns only privacy-filtered latest child-message sequence metadata. Read conversations retain recency; expired/retention/archived history is excluded. All 2,067 cloud unit/service tests, native checks and 44 isolated Electron scenarios passed. Complete receipt: bodee-guard/docs/cloud-message-order-20260928.md.

Refresh/reopen the parent PWA to load the new scripts. Installer remains 1.2.258; no child restart, live test push or family message was issued. Physical phone acceptance remains to be confirmed.
