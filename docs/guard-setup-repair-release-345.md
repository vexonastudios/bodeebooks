# Account downloads for setup repair 1.2.345

Deployed November 4, 2026 from source 8762538aae3dfe72d9927bb8989beb21d115699b.
Production deployment: dpl_BiW4dx2xh1xvX2GLFeZMpJYDNpLr.
Both guard.bodeebooks.com and bodeebooks.com were verified after promotion.

The website supplies the exact Public Stable R2 installer mapping and matching
release notes for 1.2.345. Family Beta version and signed recovery metadata were
set at build and runtime before either update feed changed. The account page
retains the automatic version checking introduced in a6db033; live Stable and
Family Beta hints both returned 1.2.345 with no-store at 2026-11-04T21:25:58.112Z.

The 44 affected account, download, candidate mapping and freshness tests passed,
as did the production build. Candidate and live download routes still require
parent sign-in; a final signed-in download click was not performed. Both exact
Windows EXEs separately passed real fresh install and repair on disposable VMs.
The child repair requires installing 1.2.345; a website refresh cannot change an
already installed 1.2.344 app. Physical household pairing/Windows approval is
not asserted by the installer test.

The full child release receipt is docs/cloud-release-1.2.345.md in the official
vexonastudios/bodee-guard repository. The API was unchanged. Previous website
rollback: dpl_Fp9f7xj2Pso8auGQ7A24HyoXNgjK. This receipt-only commit needs no
additional deployment.
