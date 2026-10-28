# Customer launch preparation without paid publisher signing

The owner selected public launch before paid Microsoft/Azure publisher signing.
The account and short download-code page now explain that the early-access
Windows installer has no verified publisher and that Windows may warn or block
setup. The notice links to help without instructing families to disable Windows
protections. The existing complimentary Family Beta download and version remain
separate from the customer release.

Cloud-owned customer access/catalog work and pending video/vocabulary fixes are
backed up in the BodeeGuard repository. This checkout includes the reviewed
Vocabulary definition/review assets, customer account/download regressions and
the installation notice. Account/download tests passed 24/24 and the Webpack
production build passed. Candidate/public deployment checks are recorded below.

Public customer enrollment remains pending the isolated laptop installation
check and accepted customer installer. The owner offered a separate laptop that
is not currently available. No trial, subscription charge or installed family
computer was changed by these source preparations.

Parent source `e765bb6` is live in `dpl_HGsNJPPbyCEum6shVVVrriXrrMBz`.
Its protected candidate was checked using authenticated Vercel curl, then
promoted; `https://guard.bodeebooks.com/install/` returned the notice over HTTPS
and displayed it correctly in the browser. The three Vocabulary assets match
reviewed source after normalizing Git line endings, with cache revalidation.
The website-owned dashboard shell was preserved. Previous deployment retained
for rollback: `dpl_sPeUisKJ6w96YYQ4sfUS75yxf8Dv`.

Cloud source has a built, freshly scanned unsigned 1.2.331 customer acceptance
installer. Customer feeds and enrollment remain closed pending laptop acceptance.
Existing Family Beta download remains 1.2.330. Paid publisher signing is deferred
by the owner's explicit decision.
