# Quick family setup — November 3, 2026

The active four-step family guide now mounts Quick family setup first, with
manual child entry in expandable details. Parents can type or optionally
dictate names, grades and schools, review/edit a draft, then confirm the batch.
The owner chose parsing on BodeeGuard's own commercial API, with no OpenAI call.
Optional browser dictation is labeled separately and is never started on load.

The bridge authenticates the parent, checks same-origin requests and forwards
only allowed preview/confirmation fields. Review cannot save automatically.
Network failures preserve the same confirmation receipt for a safe retry.
Closing releases speech; editing text or dictating again invalidates old review.
Successful saves refresh the current children without erasing manual drafts.

Validation: all 286 website tests, the production Next webpack build, the
isolated component and active-guide fixtures, and the full onboarding fixture
passed. Responsive checks cover 1200/570/390/320 pixels. Two outdated test
expectations were repaired without altering billing behavior. Real microphone
recognition remains browser-dependent and was simulated in these fixtures.

Cloud counterpart and final deployment receipt:
`bodee-guard/docs/family-quick-setup-20261103.md`.
Ignored local evidence and screenshots: `.tmp/quick-setup/`.
No Windows installer or update channel is changed by this parent feature.
