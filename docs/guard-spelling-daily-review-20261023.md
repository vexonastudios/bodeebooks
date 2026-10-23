# Daily spelling review parent integration — October 23, 2026

Source implementation only; no website/API deployment or child release here.
Companion implementation and detailed verification receipt are in BodeeGuard's
`docs/cloud-spelling-daily-review-20261023.md` on `codex/headset-reconnect`.

Selectively synchronized `cloud-spelling.js`, new `cloud-spelling-review.js`
and `spelling.css`, plus their hashes in the existing generated workspace.
Existing parent HTML, mobile layout and unrelated dashboard assets are preserved.
Cards distinguish daily independent recall, supported learning, due review,
coverage warnings and actual school test reports. Optional paper dictation
prints only the numbered answer sheet; the parent's word/sentence key is not
included. The school-result form saves date, counts, assigned missed words and
notes separately from child practice, completion, mastery and wallet records.

The signed-in same-origin dashboard bridge now allowlists `correct`, `total`,
`missed` and `note` for spelling commands; it never forwards arbitrary household,
mastery or coin authority. The cloud API validates and stores the result, with
idempotent retries and up to 20 parent reports per list.

Verification: 21 selected account/dashboard/proxy/spelling unit cases passed.
The real isolated Admin fixture in the cloud repository covers school-result
submission, safe text, print-sheet creation/cleanup and retained list history.
Final production build and TypeScript passed via `npm run build -- --webpack`.
Turbopack initially rejected the existing external dependency junction; no build
configuration was changed. Logs are ignored under `.tmp/spelling-daily/`.
Export hashes match served bytes; old/new generated HTML comparison is equal.

For a requested rollout, apply the API's idempotent school-results column change,
deploy the cloud API and parent website, then publish the Windows child that
requests daily-review protocol 3. Older child clients retain their supported
session rules. No family records or live controls were changed during these tests.
