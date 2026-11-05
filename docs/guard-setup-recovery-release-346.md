# Setup approval handoff and installer 1.2.346 — November 5, 2026

Live source: ac36fef (includes handoff 1d3a58f). Deployment: dpl_w7867XTYgUXGNSFJpjNAa8gppWcr, verified on both guard.bodeebooks.com and bodeebooks.com.

The installer-code area now directly offers computer approval, including before a download code is generated and after expiry. It explains that the download code differs from the child app pairing code. The account downloads public Stable 1.2.346 through its exact R2 mapping and retains automatic release refresh; Family Beta also reports 1.2.346. Both hints return no-store.

Verification: 43 handoff/account tests and the prior full webpack build passed; 45 combined installer/account tests passed after the R2 mapping, followed by 31 affected final notes/mapping checks. The final hosted website build, authenticated-download redirect check, aliases and signed recovery manifest checks passed. No signed-in final browser click was claimed.

API dpl_HYJdedXhX9dCsBMXNP5pD167RB1h was promoted and health-checked before the child feed. Both exact Windows installers passed actual fresh installation and repair on disposable Windows VMs. Full child evidence is in bodee-guard docs/cloud-release-1.2.346.md. Johnson’s physical installation and reapproval are not yet observed.

A queued initial unpromoted website candidate was removed as superseded; the final matching deployment includes the approval handoff, R2 mapping and release notes together. No unrelated production deployment was cancelled.
