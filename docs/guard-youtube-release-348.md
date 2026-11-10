# Parent download release 1.2.348 — November 9, 2026

Source `4338564`, based on live homepage/tutorial source `f136e29`, is deployed as
`dpl_2P33Ayr4BGSWstUU68VtRHqpzjeG` on both parent website aliases.

Added parent release notes and the exact public installer R2 mapping for build
`20e7f93dddf9c51b28ee6f78adf3b402`. Family Beta installer version 1.2.348 is set at
build and runtime with matching signed recovery metadata. Existing homepage,
tutorial, White Noise and assistant improvements remain included.

All 24 affected download/release tests and the production build passed. Candidate
download authentication and signed recovery metadata passed before promotion.
After Windows publication, both account version hints returned 1.2.348 with
no-store, the public release catalog matched, and both aliases reported the new
deployment. Parents do not need a hard refresh or a separate installer link.

The child/API release and exact EXE fresh-install/repair evidence are documented
in bodee-guard `docs/cloud-release-1.2.348.md`. Successful Google verification and
restored approved-video playback remain unconfirmed; these notes do not claim
that YouTube playback has been restored on family computers.
