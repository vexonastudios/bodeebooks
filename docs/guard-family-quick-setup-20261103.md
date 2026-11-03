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

Published from source `97149ab073b482396969c9490fea4b5ecc14f3d2` as deployment
`dpl_5ZjBP7JSMTHmELsF1UrJpHiCUX1q`, after commercial API deployment
`dpl_7uRQoSs3qP2t6PkBGpsiJJ7tRQHG`. Candidate and public release identity match.
The live tutorial account displayed Quick family setup and correctly parsed a
fictional three-child description. Its review was discarded without saving.
