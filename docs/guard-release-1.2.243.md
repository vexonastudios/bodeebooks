# Hosted student themes — Family Beta 1.2.243

Published September 26, 2026 under the continuing release authorization.

Guard source `50ff9ab132128ef81bb5b58c5724ddd76989bd26`; website source
`c8600221b09304431c31a83b769e19100fbd8500`. The hosted learning player now loads the shared student theme
loader and two reviewed stylesheets. Only those four assets and their source
hashes changed; existing parent dashboard HTML/overrides remain intact.

61 workspace/download tests passed. Production build and TypeScript passed.
Each candidate asset matched the clean archive before promotion. Public release
identity and all four asset hashes matched afterward, with revalidation headers.

Deployment `dpl_2zD6d16v6knJv1ynMZVKcGy25euK`:
https://bodeebooks-3gxybx82b-vexonastudios-3984s-projects.vercel.app

Clean archive `.tmp/theme-site-243/`; previous healthy deployment for rollback:
`dpl_GoTHtRAjdBzqLdAhBuH17iMLscWq`. Installer version 1.2.243 persisted in the
existing production variable and provided at build/runtime. The signed-in
parent account visibly showed Family Beta updates · Version 1.2.243 after reload.
The public installation page remains a download-code form without version text.

The signed child update and both hosted installers were verified before release.
Size 161351592 bytes; SHA-256
`cfebdd62f60a82fe02137ef77e1fdf9672bd31a7c538db5738dff6d019346526`.
No API or Worker deployment, stable promotion or family enrollment. Physical
child update acceptance remains with the parent. My Apps and the return-from-game
bar remain unchanged by request. Complete audit and release receipt are in the
Guard repository: `docs/cloud-student-theme-audit.md` and `docs/cloud-release-1.2.243.md`.

Public asset SHA-256 values (raw deployed bytes, matching the Git archive):
- `cloud-learning-player.html`: `740265f2902dc4432c8d59ee4ac58bfeeb0d032ca205784f378623b540761610`.
- `js/shared/student-theme-loader.js`: `4ddfb1864ff619f58981a146593d9381ed7dcdeb2525966bd3afde20e3e7a869`.
- `css/kiosk/themes.css`: `f60be34b3014f5cbfb63cb2c5f66385158194f47d7efbc567a11093708248947`.
- `css/cloud-student-theme.css`: `2f8f98ff41dc48438e91e522ce5bfb08718f903bc05d5a88ae3caee351a3242e`.
