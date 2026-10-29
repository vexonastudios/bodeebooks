# Family Beta 1.2.337 — October 29, 2026

Parent deployment dpl_7MCBuJxRhqhbVtnuxAy8wdQ7jYr8 is live from website
source 7d345e1 with the matching Family Beta installer version and parent notes.
The existing publisher persisted the production version for build and runtime,
checked ready aliases and deployed the signed recovery manifest route before
switching the Windows child feed. Both public manifest endpoints independently
returned version 1.2.337 with pinned-signature verification and envelope SHA-256
776eb73b7a5c31c6738629789905fa496a6a7009dea8450f697df52da3da92b4.

Included child source d0d6c9c89fecaf862044de2b280f8dd74e94d4bf corrects the
update notice clipping with White Noise and carries the recent windowed setup,
visible setup exit and installer presentation work. All 27 account, download
and parent-journey tests passed. The Windows installer and its hosted copies
were independently verified in the child repository release receipt.

This publishes the existing private Family Beta channel. Public enrollment and
unsigned customer candidate acceptance are separate. No family computer was
installed by the release pipeline; signed-in account visual inspection was not
repeated for this release.
