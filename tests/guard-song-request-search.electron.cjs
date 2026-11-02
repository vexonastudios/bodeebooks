'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Electron browser fixture. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), assert = require('node:assert/strict');
if (app.isPackaged) throw Error('Development fixture only');
const site = path.resolve(__dirname, '..');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-song-search-')));
app.disableHardwareAcceleration();
const searches = [], writes = [];
const request = { id: 'req-1', student_name: 'Ava', song_title: 'any song', artist_hint: 'Band jaren' };
const reply = (res, body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="mreq-list"></div><script type="module" src="/fixture.js"></script>');
    return;
  }
  if (url.pathname === '/fixture.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end("import { setupSongRequests } from '/guard-admin/cloud-song-requests.js'; setupSongRequests({endpoint:'/bridge',navigate:()=>{}}); window.loadCloudSongRequests();");
    return;
  }
  if (url.pathname === '/bridge') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const command = JSON.parse(raw);
    if (command.path === '/api/music/requests') return reply(res, { status: 200, body: [request] });
    if (command.path === '/api/music/tracks') return reply(res, { status: 200, body: [] });
    if (command.path.startsWith('/api/youtube/search?')) {
      searches.push(command.path);
      return reply(res, { status: 200, body: { results: [
        { youtube_id: 'abcdefghijk', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk', title: 'First recording', channel: 'Band Jaren' },
        { youtube_id: 'lmnopqrstuv', youtube_url: 'https://www.youtube.com/watch?v=lmnopqrstuv', title: 'Second recording', channel: 'Band Jaren' }
      ] } });
    }
    if (command.path === '/api/music/requests/req-1/resolve') { writes.push(command); return reply(res, { status: 200, body: { success: true } }); }
    return reply(res, { status: 200, body: {} });
  }
  if (/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)) {
    const file = path.join(site, 'public', url.pathname);
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
      res.end(fs.readFileSync(file)); return;
    }
  }
  res.statusCode = 404; res.end();
});
let win;
const js = code => win.webContents.executeJavaScript(code, true);
const until = async code => { for (let i = 0; i < 120; i++) { if (await js(code)) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error('Timed out: ' + code); };
(async () => {
  try {
    await app.whenReady();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    session.defaultSession.webRequest.onBeforeRequest((details, done) => done({ cancel: !details.url.startsWith(origin + '/') && !details.url.startsWith('data:') }));
    win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await win.loadURL(origin);
    await until("document.querySelector('.song-request-card button')");
    await js("document.querySelector('.song-request-card button').click()");
    await until("document.querySelector('.song-review-dialog')?.open");
    await js("const input=document.querySelector('.song-review-source input');input.value='Band jaren';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.song-review-source button').click()");
    await until("document.querySelectorAll('.song-review-result').length===2");
    assert.match(searches[0], /q=Band%20jaren/);
    assert.equal(await js("document.querySelector('.song-review-dialog > .btn').disabled"), true);
    assert.equal(await js("document.querySelector('.song-review-dialog').scrollWidth <= innerWidth+1"), true);
    assert.equal(writes.length, 0);
    await js("document.querySelector('.song-review-result').click()");
    await until("document.querySelector('.song-review-preview iframe')");
    assert.match(await js("document.querySelector('.song-review-preview iframe').src"), /abcdefghijk/);
    assert.equal(await js("document.querySelector('input[aria-label=\"Recording title\"]').value"), 'First recording');
    await js("document.querySelector('.song-review-consent input').click();document.querySelector('.song-review-dialog > .btn').click()");
    await until("!document.querySelector('.song-review-dialog')");
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].body, { action: 'approve', youtube_id: 'abcdefghijk', artist: 'Band Jaren', title: 'First recording', screened: true });
    console.log('Mobile song request search, review, and child approval passed.');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { win?.destroy(); server.close(); app.exit(process.exitCode || 0); }
})();



