# Parent assistant workflows — October 4, 2026

This parent-site change pairs with BodeeGuard cloud source 75a6ed8c. The versioned source database and maintenance/verification receipt are in that repository at services/commercial-api/knowledge/parent-workflows.json and docs/cloud-parent-assistant-workflows-20261004.md.

The shared assistant JS/CSS is mirrored selectively. The existing Clerk/same-origin bridge adds only the supported settings approval route and allowlisted named-child game-time fields; arbitrary household authority, model, tools and routes are ignored. Reviews are cancellable, bounded, phone accessible and retry the same command ID.

Verified: all 67 parent workspace/update/onboarding/assistant bridge tests, TypeScript and production website build. The isolated guard-assistant-review.electron.cjs fixture uses the actual assistant service with fictional children at 1200, 390 and 320 pixels. It checks no save before confirmation, named recipient, duplicate clicks, a committed-but-lost reply, exact retry, and closing cancellation. Synthetic screenshot/logs remain ignored under .tmp. No live parent messages or settings were changed.

This is queued source, not live deployment. Publish the matching API and existing parent site in the next authorized release. No database migration or Windows installer is needed for this assistant change. The separate family-setup AI parser remains unconnected/unpublished and needs its existing pending data-transfer authorization; do not infer that approval from this source push.
