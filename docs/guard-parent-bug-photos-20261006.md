# Bug-report photo attachments — October 6, 2026

Parents are prompted to photograph the child's screen, especially an error message. The existing authenticated Report a bug page adds separate Take a photo and Choose photos controls, optional previews/removal, and enlarged viewing. Up to three pictures can accompany the initial report or a later reply. Photos also appear inline in Admin → Parent reports. Camera capture uses an immediately activated native input with capture=environment; the gallery input supports multiple files.

ReportPhotos.tsx performs bounded JPEG conversion and preview in the browser. ReportForm persists the report photos with its existing draft/exact pending request, shows a warning if browser storage is unavailable, and preserves lost-response retries. Images are fetched through parent or operator authenticated POST proxies; the private bytes never enter the public Next image optimizer or AI processing. Saved photos are served as verified JPEG data with private/no-store response policy.

The API owns validation, immutable private object storage, metadata removal, quotas, idempotency and cleanup. See cloud docs/cloud-parent-bug-photos-20261006.md for contracts and migration details.

Validation: 235 website tests, TypeScript, targeted lint and real-component synthetic Electron checks passed. The UI fixture covers camera/gallery selection, four responsive widths, limits, preview/removal, enlargement, image-load retry, initial report/reply retries, reload retention, browser-storage failure and staff viewing. No physical Android camera or real household image was tested.

This is an API/parent-site release only. Keep Windows 1.2.293 and its signed recovery manifest unchanged. Source and deployment evidence follow below.
