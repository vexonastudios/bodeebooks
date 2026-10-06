# Bug-report photo attachments — October 6, 2026

Parents are prompted to photograph the child's screen, especially an error message. The existing authenticated Report a bug page adds separate Take a photo and Choose photos controls, optional previews/removal, and enlarged viewing. Up to three pictures can accompany the initial report or a later reply. Photos also appear inline in Admin → Parent reports. Camera capture uses an immediately activated native input with capture=environment; the gallery input supports multiple files.

ReportPhotos.tsx performs bounded JPEG conversion and preview in the browser. ReportForm persists the report photos with its existing draft/exact pending request, shows a warning if browser storage is unavailable, and preserves lost-response retries. Images are fetched through parent or operator authenticated POST proxies; the private bytes never enter the public Next image optimizer or AI processing. Saved photos are served as verified JPEG data with private/no-store response policy.

The API owns validation, immutable private object storage, metadata removal, quotas, idempotency and cleanup. See cloud docs/cloud-parent-bug-photos-20261006.md for contracts and migration details.

Validation: 235 website tests, TypeScript, targeted lint and real-component synthetic Electron checks passed. The UI fixture covers camera/gallery selection, four responsive widths, limits, preview/removal, enlargement, image-load retry, initial report/reply retries, reload retention, browser-storage failure and staff viewing. No physical Android camera or real household image was tested.

This is an API/parent-site release only. Keep Windows 1.2.293 and its signed recovery manifest unchanged. Source and deployment evidence follow below.

## Published Family Beta receipt

Published and publicly verified October 6, 2026 at 18:08 UTC. Parent source `3b27616aa0a8098bb56903262556dfecec0754cc` deployed from clean `C:/Projects/worktrees/bodee-books/parent-bug-photos-20261006` as `dpl_77qYfPohuCBtLY6U2j6gYR6ziYg1`. API source `346e99632dd8aecf887f064892676d66dc52924f` deployed as `dpl_F1j5pZEDrSKBULsxKFz5fKNF6W3C`; its scoped provisioning applied and verified the private photo migration. Both sources are pushed to their existing official branches.

Candidate and public health/sign-in checks passed. Parent and staff photo proxies require authentication. All fourteen existing parent assets on guard.bodeebooks.com and www.bodeebooks.com matched the clean checkout; the release endpoint confirms the new parent deployment. Windows 1.2.293 and all primary/recovery signed manifests are unchanged (SHA-256 `544859af60b4815276a49e6c64d010a6ea99203619b11885a659efa07f85a20f`). The full cloud receipt records 2,352 unit/service tests, native checks, all 48 student scenarios including one unchanged workspace recheck, and website/component validation.

Rollback: parent `dpl_4SAnUBJhyMzSNSGD7uCa5mvkHsyG`, then API `dpl_DLSf6oCa5hU68GvkbKCrfadvL9oX` if needed; retain additive photo data for recovery. No production household report was created for testing. A physical Android PWA camera capture and signed-in production photo submission remain unobserved. No child installation or daily automation is needed or was performed.
