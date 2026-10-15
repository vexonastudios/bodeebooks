# Message activity unlocks and responsive parent controls — October 15, 2026

> Deployment update: Published and verified on October 15, 2026. See [guard-parent-controls-deploy-20261015.md](guard-parent-controls-deploy-20261015.md) for exact sources, live checks and rollback targets. This supersedes the historical pending-delivery statements below. No child installer was released.

Pending local parent source based on 841c1be, matching BodeeGuard commit 137bbc05. No deployment or live family settings change has occurred.

A child message asking to unlock Art Studio and Piano now gets a separate parent button for each. Suggestions use the child's actual assignments, saved titles and common aliases; all supported installed activities and custom titles participate. Specific unavailable activities cannot fall back to other media (Learning Videos is never recreational Videos). Private/group author IDs, explicit parent clicks, existing assignment/authentication checks, daily limits and child-sync semantics are preserved. No automatic message is sent.

Parents can select several independent activities or children while earlier changes save. Each has its own pending/success/error feedback; related controls cannot double-submit. Ordered writes preserve click order, including grouped media changes. Successful responses update the dashboard immediately; one coalesced follow-up refresh replaces the old refresh-per-click wait. This adds no AI calls or recurring polling.

Only matching assets and the relevant workspace integration were transferred. Website-specific refresh/account/onboarding/push integrations were preserved, and entry script/stylesheet URLs were versioned. The pre-existing feedback popup differences between cloud reference and website were left intact. No API change or child installer is required for this feature; a parent website deployment is pending.

Verification:

- BodeeGuard full baseline: 2,642 unit/service tests, native checks, all 51 Electron scenarios. Final matcher/message/group-order follow-ups passed 8 focused units, syntax/lint and the relevant real renderer checks; see its docs/cloud-message-unlocks-20261015.md for exact evidence and scope.
- Actual full website dashboard through the isolated cloud fixture with BODEEGUARD_UNLOCK_WEBSITE_ROOT set to this checkout: rapid multi-select, individual failure/retry, linked studios, child isolation, grouped ordering, same-media pending state, one batch read and 320/390/1200px layouts passed. No account or family server contacted.
- tests/guard-message-media-actions.electron.cjs: actual messages/queue at 320/390/1400px, supplied Piano/Art Studio request, assignments removed during viewing, named-media separation, no automatic writes, author binding, malformed/lost receipts, double taps and navigation during saving passed. Screenshots inspected under .tmp/message-unlocks-20261015/.
- tests/guard-action-feedback.electron.cjs: inline/popup expiry, persistent pending/errors, stale-result/timer handling, navigation fallback, focus pause, modal dismissal, reduced motion and phone layout passed. Its older expectation of duplicate inline+popup success was corrected to the established single-inline behavior; hidden fixture controls use an explicit display:none so test CSS cannot override hiding.
- 98 account/workspace/dashboard/idle/refresh tests passed: .tmp/unlock-controls-tests.log.
- npx next build --webpack passed: .tmp/unlock-controls-webpack.log. Initial npm run build (Turbopack) rejected the existing out-of-root dependency junction; no dependency/build configuration was changed. Later changes affected public renderer assets/fixtures only and were directly reverified.
- Shared matching assets verified against cloud source (allowing the exported relative import paths). Source hashes retained in .tmp/message-unlocks-source.json. Whitespace checks passed.

Keep this with the pending Parent Assistant and weekly-report improvements for the next requested deployment. After publication, confirm one real phone message unlock and connected-child receipt. The prior printer recovery remains separate child-release/physical acceptance work.
