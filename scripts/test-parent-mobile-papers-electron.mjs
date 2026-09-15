// Synthetic mobile layout fixture only. No parent session, family data or production API.
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-parent-mobile-papers-')));
app.disableHardwareAcceleration();

const template = JSON.parse(fs.readFileSync(path.join(root, 'app/guard/dashboard/generated/workspace.json'), 'utf8')).html;
const fixture = `
  import { setupCloudMobile } from '/guard-admin/cloud-mobile.js';
  let mobile;
  window.navigate = id => {
    for (const tab of document.querySelectorAll('.tab-content')) tab.classList.toggle('active', tab.id === 'tab-' + id);
    mobile?.setActive(id);
  };
  mobile = setupCloudMobile({ navigate, refresh: async () => {}, openSpelling: async () => {} });
  navigate('grades');
  window.lucide?.createIcons();
  window.ready = true;
`;
const html = template
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace('</head>', '<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
  .replace('</body>', '<script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://fixture.local');
  response.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); return response.end(html); }
  if (url.pathname === '/fixture.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(fixture); }
  if (/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)) {
    const file = path.join(root, 'public', url.pathname);
    if (fs.existsSync(file)) {
      response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
      return response.end(fs.readFileSync(file));
    }
  }
  response.writeHead(404); response.end();
});

(async () => { try {
  await app.whenReady();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details, done) => done({ cancel: !details.url.startsWith(origin) && !details.url.startsWith('data:') && !details.url.startsWith('blob:') }));
  const win = new BrowserWindow({ show: false, width: 390, height: 780, useContentSize: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  const js = code => win.webContents.executeJavaScript(code, true);
  const wait = async code => { for (let attempt = 0; attempt < 100; attempt++) { if (await js(code)) return; await new Promise(resolve => setTimeout(resolve, 30)); } assert.fail('Timed out: ' + code); };
  await win.loadURL(origin);
  await wait('window.ready && document.body.classList.contains("cloud-papers-active")');
  assert.equal(await js(`(() => {
    const card = document.querySelector('#tab-grades .cloud-papers').getBoundingClientRect();
    const actions = document.querySelector('.mobile-paper-actions');
    const buttons = [...actions.querySelectorAll('button')].map(button => button.getBoundingClientRect());
    const selected = document.querySelector('.mobile-selected-file').getBoundingClientRect();
    return getComputedStyle(actions).display === 'grid'
      && buttons.length === 2
      && Math.abs(buttons[0].top - buttons[1].top) < 2
      && buttons.every(button => button.left >= card.left && button.right <= card.right)
      && selected.left >= card.left && selected.right <= card.right
      && document.documentElement.scrollWidth <= innerWidth;
  })()`), true);
  assert.ok(await js('parseFloat(getComputedStyle(document.querySelector("#tab-grades .cloud-papers > h2")).fontSize) <= 22'));
  assert.equal(await js('getComputedStyle(document.querySelector("#parent-assistant-launcher")).display'), 'none');
  await js('document.querySelector("#cloud-files-status").textContent="1 file · 0.1 / 128 MB used. Images, PDFs and audio: up to 2 MB each.";document.querySelector(".main-content").scrollTop=0');
  fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
  fs.writeFileSync(path.join(root, '.tmp', 'parent-mobile-school-papers.png'), (await win.webContents.capturePage()).toPNG());
  await js('document.querySelector("#cloud-files-status").scrollIntoView({block:"center"})');
  assert.equal(await js(`(() => {
    const status = document.querySelector('#cloud-files-status').getBoundingClientRect();
    const main = document.querySelector('.main-content').getBoundingClientRect();
    return status.left >= main.left && status.right <= main.right && status.top >= main.top && status.bottom <= main.bottom;
  })()`), true);
  win.setContentSize(320, 568);
  await wait('innerWidth === 320');
  assert.equal(await js('document.documentElement.scrollWidth <= innerWidth'), true);
  win.destroy(); server.close();
  console.log('PASS: compact School Papers form, camera/file controls, reachable status and narrow phone layout');
  app.exit(0);
} catch (error) {
  console.error(error?.stack || error);
  server.close(); app.exit(1);
} })();
