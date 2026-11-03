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

## Same-day spoken-description repair

The commercial API now accepts ordinary repeated "I got [name] who's in
[grade]" clauses without punctuation. The website retains unrecognized text
and offers manual entry without presenting an empty review or confirmation.
Manual recovery expands and focuses the child form without saving a child.

Website source `25ef367` is live as `dpl_DYBHrjQ6YzucuXLZh5GrvSgpZw5N`,
promoted after API source `026f9472` / `dpl_JA4aofRpnbzVih2Dg6mu5346oC9P`.
All 286 website tests, the production build and both isolated family fixtures
passed. Candidate assets and public release identity were verified. API and
dashboard verification details are in the cloud counterpart receipt above.

The owner's exact dictated description produced three draft children with
grades 5, 11 and 1 on the live website. The draft remains open for the owner;
no confirmation or child creation was performed. No Windows update is needed.
Previous healthy website rollback: `dpl_5ZjBP7JSMTHmELsF1UrJpHiCUX1q`.
