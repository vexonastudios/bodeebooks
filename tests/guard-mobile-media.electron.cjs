'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Electron browser fixture. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const site = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-mobile-media-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();
const panels = require(path.join(site, 'app/guard/dashboard/generated/media.json'));
let html = require(path.join(site, 'app/guard/dashboard/generated/workspace.json')).html;
for (const [id, panel] of Object.entries(panels))
  html = html.replace(new RegExp(`<section class="tab-content" id="tab-${id}"[\\s\\S]*?<\\/section>`), panel);
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace('</head>', '<link rel="stylesheet" href="/guard-admin/parent-mobile.css"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
  .replace('</body>', '<script src="/guard-admin/lucide.min.js"></script><script src="/guard-admin/media-defaults.js"></script><script type="module" src="/fixture.js"></script></body>');
const writes = [];
const students = [{ id: 'child-1', name: 'Ava' }, { id: 'child-2', name: 'Ben' }];
const reply = (res, body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
  if (url.pathname === '/fixture.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`import '/guard-admin/cloud-media-admin.js';import {setupCloudMobile} from '/guard-admin/cloud-mobile.js';
      window._adminApiKey='fixture';window.showToast=(message,error)=>{window.lastToast={message,error};};
      let mobile;const navigate=id=>{document.querySelectorAll('.tab-content').forEach(panel=>panel.classList.toggle('active',panel.id==='tab-'+id));mobile?.setActive(id);};
      mobile=setupCloudMobile({navigate,refresh:async()=>{}});navigate('mobile-add');window.fixtureNavigate=navigate;`);
    return;
  }
  if (url.pathname === '/guard/dashboard/bridge/') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const command = JSON.parse(raw); const route = command.path;
    if (command.method !== 'GET') writes.push(command);
    if (route.startsWith('/api/youtube/search')) return reply(res, { status: 200, body: { results: [{ title: 'Test video', channel: 'Test channel', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk', thumbnail_url: '' }] } });
    if (route === '/api/students') return reply(res, { status: 200, body: students });
    if (route === '/api/music/settings') return reply(res, { status: 200, body: {} });
    if (route === '/api/music/tracks' && command.method === 'POST') return reply(res, { status: 200, body: { id: 'song-1' } });
    if (route === '/api/music/tracks') return reply(res, { status: 200, body: [] });
    if (route.startsWith('/api/music/lookup')) return reply(res, { status: 200, body: { title: 'Test song', author_name: 'Test artist' } });
    if (route === '/api/music/assignments') return reply(res, { status: 200, body: {} });
    if (route === '/api/video/videos' && command.method === 'POST') return reply(res, { status: 200, body: { id: 'video-1' } });
    return reply(res, { status: 200, body: route.includes('requests') ? [] : {} });
  }
  if (url.pathname === '/api/youtube/search')
    return reply(res, { results: [{ title: 'Test video', channel: 'Test channel', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk', thumbnail_url: '' }] });
  if (!/^\/guard-admin\/[a-zA-Z0-9._/-]+$/.test(url.pathname) || url.pathname.includes('..')) { res.writeHead(404); res.end(); return; }
  const file = path.join(site, 'public', url.pathname);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(fs.readFileSync(file));
});
(async () => {
  let win;
  try {
    await app.whenReady();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    session.defaultSession.webRequest.onBeforeRequest((details, done) => done({ cancel: !details.url.startsWith(origin + '/') && !details.url.startsWith('data:') }));
    win = new BrowserWindow({ show: false, width: Number(process.env.BODEE_WIDTH || 390), height: 844, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    const evalJs = code => win.webContents.executeJavaScript(code);
    const wait = async code => { for (let i = 0; i < 160; i++) { if (await evalJs(code)) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error('Timed out: ' + code); };
    const waitWrite = async predicate => { for (let i = 0; i < 160; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error('Timed out waiting for media save'); };
    await win.loadURL(origin);
    await wait('document.querySelectorAll(".mobile-media-choice").length===3');
    assert.deepEqual(await evalJs('[...document.querySelectorAll(".mobile-schoolwork-copy strong")].map(el=>el.textContent)'),
      ['Spelling', 'Vocabulary', 'Poems', 'Worksheets', 'Learning videos']);
    assert.equal(await evalJs('document.querySelector(".mobile-schoolwork-choices").getBoundingClientRect().top < document.querySelector(".mobile-media-choices").getBoundingClientRect().top'), true);
    if (process.env.BODEE_CAPTURE) {
      const folder = path.join(site, '.tmp', 'mobile-media-ui'); fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, 'add-media.png'), await win.webContents.capturePage().then(image => image.toPNG()));
    }
    for (const kind of ['spelling', 'vocabulary', 'poems', 'worksheets', 'learning-videos']) {
      await evalJs(`document.querySelector('[data-schoolwork-kind="${kind}"] .mobile-schoolwork-open').click()`);
      await wait(`document.getElementById('tab-${kind}').classList.contains('active')`);
      await evalJs("window.fixtureNavigate('mobile-add')");
    }
    assert.equal(await evalJs('document.getElementById("tab-mobile-add").scrollWidth<=document.querySelector(".main-content").clientWidth+1'), true);
    assert.deepEqual(await evalJs('[...document.querySelectorAll(".mobile-media-copy strong")].map(el=>el.textContent)'), ['Videos', 'Music', 'Audiobooks']);
    for (const [kind, input, audience] of [['videos', 'video-yt-url', 'video-global-input'], ['music', 'music-yt-url', 'music-all-students-input'], ['audiobooks', 'ab-youtube-url', 'ab-global']]) {
      await evalJs(`document.querySelector('[data-media-kind="${kind}"] .mobile-media-open').click()`);
      await wait(`document.getElementById('tab-${kind}').classList.contains('mobile-media-add')&&document.getElementById('tab-${kind}').classList.contains('active')`);
      assert.equal(await evalJs(`document.getElementById('tab-${kind}').scrollWidth<=document.querySelector('.main-content').clientWidth+1`), true);
      assert.equal(await evalJs(`!!document.getElementById('${input}') && getComputedStyle(document.getElementById('${input}')).display!=='none'`), true);
      await evalJs(`document.querySelector('#tab-${kind} [data-youtube-search-target]').click()`);
      await wait('document.getElementById("youtube-search-modal")?.classList.contains("active")');
      await evalJs(`document.getElementById('desktop-yts-query').value='test';document.getElementById('desktop-yts-form').requestSubmit()`);
      await wait('document.querySelector("[data-yts-result]")');
      await evalJs('document.querySelector("[data-yts-result]").click()');
      const preview = kind === 'videos' ? 'video-preview' : kind === 'music' ? 'music-preview' : 'ab-preview';
      await wait(`document.getElementById('${preview}').style.display!=='none'`);
      if (process.env.BODEE_CAPTURE && kind === 'music') {
        const folder = path.join(site, '.tmp', 'mobile-media-ui');
        await new Promise(resolve => setTimeout(resolve, 100));
        fs.writeFileSync(path.join(folder, 'add-music.png'), await win.webContents.capturePage().then(image => image.toPNG()));
      }
      assert.equal(await evalJs(`document.getElementById('${audience}').checked`), true);
      if (kind === 'videos') {
        await evalJs(`document.getElementById('video-title-input').value='Test video';document.getElementById('video-screened-input').checked=true;document.getElementById('video-add-btn').click()`);
        await waitWrite(() => writes.some(item => item.path === '/api/video/videos/video-1' && item.body?.is_global === true && item.body?.screened === true));
      } else if (kind === 'music') {
        await evalJs(`document.getElementById('music-screened-input').checked=true;document.getElementById('music-add-btn').click()`);
        await waitWrite(() => writes.filter(item => item.path === '/api/music/assign').length === students.length);
        assert.deepEqual(writes.filter(item => item.path === '/api/music/assign').map(item => item.body.student_id).sort(), students.map(student => student.id));
      } else {
        await evalJs(`document.getElementById('ab-title').value='Test book';document.getElementById('ab-screened').checked=true;document.getElementById('ab-add').click()`);
        await waitWrite(() => writes.some(item => item.path === '/api/audiobooks/items' && item.body?.is_global === true && item.body?.screened === true));
      }
      await evalJs(`document.querySelector('#tab-${kind} .mobile-media-toolbar button').click()`);
    }
    console.log('Mobile Add media: all three search, review, and save for every child.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { win?.destroy(); server.close(); app.exit(process.exitCode || 0); }
})();
