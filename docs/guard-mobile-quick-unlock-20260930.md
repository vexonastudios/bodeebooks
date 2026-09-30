# Compact mobile Quick Unlock — September 30, 2026

The parent dashboard now puts each child's Quick Unlock icon in the collapsed
card header where the school-duration label was. The collapsed card occupies one
row; school durations remain in expanded details. The same dialog and full
desktop button are retained, with a 44-pixel mobile touch target and an
accessible child-specific label.

- Reviewed website source: `fc8fae9ccd926d8b8ff6d9283d022b10bffc93fe`.
- Existing private Family Beta domain: `https://guard.bodeebooks.com`.
- Production deployment: `dpl_3tYzWqhBHs5DrsCAAH3Nqub5ewj7`.
- Previous healthy deployment for rollback: `dpl_GxsKM3c2BDtGqYJXrke83ueMJQWT`.
- Clean committed-source archive and verification downloads:
  `.tmp/quick-unlock-fc8fae9-20260930/`.

The isolated fictional-data mobile fixture passed at 320, 390, and 768 pixels,
including header placement, no overlap, dialog opening, expansion, and desktop
restoration. Changed dashboard JavaScript passed scoped ESLint, the fixture
parsed, and `git diff --check` passed. Repository-wide ESLint stalled while
scanning unrelated files and was stopped; the existing CommonJS imports in the
fixture trigger its current lint rule. The Vercel production-target build and
TypeScript check passed. Before promotion and on the live domain, both served
assets matched the clean archive byte-for-byte (SHA-256):

- `cloud-mobile.js`: `635f3f9c1c5cad0ef00b79e912e98f7bae3e58dbdd6babeda4a811e305a1e31`
- `cloud-mobile.css`: `f10b329609a2a11cb11492618e006c9524b4080bb311baccf03dbeeb59fbbc96`

The public release endpoint returned the production deployment ID. This was a
website-only release; no API or child installer was changed.
