# Parent assessment reporting and Windows 1.2.324

The reporting panel and dedicated reviewed permissions import were deployed
first from `2e387547b890047f694a9ac099c33ababcb27481` to production
`dpl_HceV5kqHjmV3Z7LsXBinfXyhCAxa`. Both public aliases and the three new asset
hashes passed; anonymous import access returned 401. The API deployment
`dpl_B5mZED8LcLsTbEWbVQC6QHnChy2n` was healthy before this promotion.

The next matching Windows release is 1.2.324. Parent download notes mirror its
reviewed release-note data; 13 account tests and TypeScript passed. The final
publisher will deploy the matching download and independent recovery metadata
before switching the signed child feed. Source and deployment evidence for
the first stage is in `.tmp/abeka-assessments-parent-publication.json`.

Parent feature verification passed the recorded full site suite, final 63
workspace tests including a realistic 500-item import, and isolated phone UI
checks. Fixed routes retain parent sign-in, same-origin checks, confirmation,
request bounds and API authority. Parent/student Abeka logins stay separate;
permissions use an explicit reviewed metadata import. Child reporting needs
the new Windows release. Missing history does not establish completion and
previously unseen grades cannot be backfilled. No household review preference
or official Abeka assessment/grade was changed during deployment.

Final publication details will be recorded after the Windows artifacts,
matching parent download and pinned signed feeds have been verified.
