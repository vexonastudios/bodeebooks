// Isolated browser fixture: no Clerk account, production API or family commands.
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-parent-updates-')));
let latest = 'a'.repeat(64), launches = 0, versionRequests = 0;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://fixture.local');
  response.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/' || url.pathname === '/dashboard/') {
    launches++; response.setHeader('Content-Type', 'text/html');
    return response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe title="BodeeGuard Parent Dashboard" sandbox="allow-scripts allow-same-origin allow-modals allow-top-navigation-by-user-activation" src="/workspace/"></iframe><script>const version=${JSON.stringify(latest)};addEventListener('message',event=>{const frame=document.querySelector('iframe');if(event.origin!==location.origin||event.source!==frame.contentWindow)return;if(event.data?.type==='bodeeguard-check-worker')frame.contentWindow.postMessage({type:'bodeeguard-shell-version',version},location.origin);if(event.data?.type==='bodeeguard-reload-app')location.reload();});</script></body></html>`);
  }
  if (url.pathname === '/workspace/') {
    response.setHeader('Content-Type', 'text/html');
    return response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="bodeeguard-app-version" content="${latest}"><link rel="stylesheet" href="/guard-admin/cloud-app-updates.css"><style>body{font:16px system-ui;background:#100e1d;color:#fff;padding:20px}textarea{width:90%;height:120px}</style></head><body><h1>Parent dashboard</h1><label>Message draft<textarea id="draft"></textarea></label><script>window.clock=Date.now();Date.now=()=>window.clock;window.accept=false;window.confirm=()=>window.accept;</script><script type="module" src="/guard-admin/cloud-app-updates.js"></script></body></html>`);
  }
  if (url.pathname === '/guard-parent-version.json') {
    versionRequests++; response.setHeader('Content-Type', 'application/json'); return response.end(JSON.stringify({ version: latest }));
  }
  if (/^\/guard-admin\/cloud-app-updates\.(?:js|css)$/.test(url.pathname)) {
    response.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
    return response.end(fs.readFileSync(path.join(root, 'public', url.pathname)));
  }
  response.writeHead(404); response.end();
});
(async () => { try {
  await app.whenReady(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details, done) => done({ cancel: !details.url.startsWith(origin) }));
  const win = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  const run = code => win.webContents.executeJavaScript(`(()=>{const f=document.querySelector('iframe')?.contentWindow;if(!f)return null;${code}})()`, true);
  const waitFor = async fn => { for (let n = 0; n < 150; n++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 30)); } assert.fail('Fixture timed out'); };
  await win.loadURL(origin);
  await waitFor(() => run('return !!f.document.querySelector("#cloud-app-update")'));
  await waitFor(() => versionRequests === 1);
  assert.equal(launches, 1); assert.equal(await run('return f.document.querySelector("#cloud-app-update").hidden'), true);
  latest = 'b'.repeat(64);
  await run('f.clock+=61000;f.dispatchEvent(new f.Event("bodeeguard-check-update"));');
  await waitFor(() => launches === 2);
  await waitFor(() => run(`return f.document.querySelector('meta[name="bodeeguard-app-version"]')?.content===${JSON.stringify(latest)} && !!f.document.querySelector('#cloud-app-update')`));
  await waitFor(() => versionRequests === 3);
  assert.equal(launches, 2, 'an untouched open app reloads exactly once into the new deployment');
  await run('const input=f.document.querySelector("#draft");input.value="Keep my unfinished message";input.dispatchEvent(new f.Event("input",{bubbles:true}));');
  latest = 'c'.repeat(64);
  await run('f.clock+=61000;f.dispatchEvent(new f.Event("bodeeguard-check-update"));');
  await waitFor(() => run('return !f.document.querySelector("#cloud-app-update").hidden'));
  assert.equal(launches, 2); assert.equal(await run('return f.document.querySelector("#draft").value'), 'Keep my unfinished message');
  for (const [label, width, height] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    win.setContentSize(width, height); await new Promise(resolve => setTimeout(resolve, 70));
    const box = await run('const p=f.document.querySelector("#cloud-app-update").getBoundingClientRect(),a=f.document.querySelector("#cloud-app-update a").getBoundingClientRect();return {left:p.left,right:p.right,top:p.top,bottom:p.bottom,touchHeight:a.height,linkBottom:a.bottom};');
    assert.ok(box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height); assert.ok(box.touchHeight >= 44 && box.linkBottom <= height);
    if (process.env.BODEE_PREVIEW_DIR) {
      fs.mkdirSync(process.env.BODEE_PREVIEW_DIR, { recursive: true });
      fs.writeFileSync(path.join(process.env.BODEE_PREVIEW_DIR, `pwa-update-${label}.png`), (await win.webContents.capturePage()).toPNG());
    }
  }
  await run('f.document.querySelector("#cloud-app-update a").click();');
  assert.equal(launches, 2); assert.equal(await run('return f.document.querySelector("#draft").value'), 'Keep my unfinished message', 'cancelling Update preserves the draft');
  await run('f.accept=true;f.document.querySelector("#cloud-app-update a").click();');
  await waitFor(() => launches === 3);
  await waitFor(() => run(`return f.document.querySelector('meta[name="bodeeguard-app-version"]')?.content===${JSON.stringify(latest)} && !!f.document.querySelector('#cloud-app-update')`));
  assert.equal(new URL(win.webContents.getURL()).pathname, '/dashboard/', 'Update navigates the whole PWA through the sandbox');
  win.destroy(); server.close();
  console.log('PASS: deployment reload, draft preservation, cancellation, full-app update, desktop and phone layout.');
  app.exit(0);
} catch (error) { console.error(error); server.close(); app.exit(1); } })();
