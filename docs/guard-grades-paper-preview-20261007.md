# Grades paper preview — October 7, 2026

Grades > Papers to review used the generic private-file attachment dialog. For PDFs, **Open** showed only a download message in a small upper-left panel. The hosted parent dashboard now opens the same canvas-rendered, multi-page private viewer used by Documents. A parent can read the paper in place, move between pages, zoom, print, download the original, mark it reviewed, and open the grade editor. Image papers use the same viewer. Message attachments retain their existing private-file flow; that dialog is now centered and responsive.

The preview reads the authenticated file once when opened. It validates file identity, MIME type and size, does not execute PDF-authored content, and releases temporary URLs and PDF rendering when closed. No API, storage, child installer or signed update feed changed.

Verification used an isolated two-page PDF and fictional children: Grades opened the page viewer rather than the old download-only panel; page navigation, download, review, and desktop/phone layout passed. The existing Documents grade/print flow passed. The parent site's webpack production build, 62 dashboard/workspace tests, and changed-file lint passed (one pre-existing warning). Turbopack cannot build from this worktree's external `node_modules` junction; the webpack build passed. Repository-wide site lint includes unrelated generated files and fails outside the changed source.

The change is scoped to the existing private Family Beta parent site. No real family paper was opened for testing. Physical parent-device acceptance remains to be checked after publication.
