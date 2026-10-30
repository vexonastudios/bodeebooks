# Document completion controls — October 30, 2026

Prepared locally; not deployed. Existing parent exit-review changes are preserved. This feature adds Mark complete directly to ready ungraded child submission cards, Completed status/filter and Reopen review, using the existing private review endpoint. Printing and grading remain separate. The original paper stays available. Saves are independent per document; duplicate clicks share a request, matching receipts drive success and errors remain actionable.

Deploy the commercial API grade-preservation safeguard from the cloud repository first, then this parent website. No schema migration or Windows release is needed for document completion. Existing Windows/school fixes have their own release requirements. No real parent submission was marked reviewed during implementation.

Verification: all 63 workspace tests, production Webpack build, actual Documents desktop/390/320 renderer fixture and full mobile messaging/document reminder integration passed. The cloud file regression confirms a stale ungraded card cannot clear a grade saved in another tab. Full cloud verification passed: all 2,844 unit/service cases, native protection checks and all 57 isolated Electron scenarios. The complete receipt is docs/cloud-document-completion-20261030.md in the cloud repository. Synthetic screenshots are in the cloud worktree out/documents-preview/complete-1440.png, complete-390.png and complete-320.png.

Cache queries advance the root workspace entry, Documents CSS and both document modules; keep the website-owned modules intact during future selective admin exports. No API proxy route or household authority was broadened.

Normalized hashes (trimmed LF text):

- public/guard-admin/cloud-documents.js: 41ff12c405fbb0074896824d743bc41b2cc5146309591aa007b5c34dd3824f4a
- public/guard-admin/cloud-document-preview.js: 7888fd2d396ea78e52a3b9ead487c2dd57403dc13a7b31012798aa3c5211da20
- public/guard-admin/cloud-documents.css: 435b40f6424e23d5c6142098c339f130a93ad42f10f85f5731bae2a52bafe622
- public/guard-admin/cloud-workspace.js: ad22f6457bfb7e7164b7679dd1993883bb5451c3c6d21c3146f75b79a32ebe2b
- app/guard/dashboard/workspace/route.ts: aae096e94fe25e6e73d76af51fc1c1eced470dbdab9cf9d0da8becff20279623
- tests/guard-mobile-messages.electron.cjs: 391e03fdc4bf115f62f4d00eb9af748f938d637272e5b4877560ed9c8a684f5c
