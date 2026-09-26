'use strict';
// Real browser DOM, isolated profile, fictional actions, deterministic expiry clock.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-action-expiry-')));
const site = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><head><link rel="stylesheet" href="/cloud-monitoring.css"><style>body{margin:24px;background:#0d0d1b;color:#f1efff;font:16px Arial}main{max-width:650px}section{display:grid;gap:8px;padding:20px;border:1px solid #344554;border-radius:16px}button{padding:12px;background:#131d2d;color:#62deb9;border:1px solid #36655e;border-radius:10px}</style></head><body><main id="admin-dashboard"><h1>Live Monitoring</h1><section id="controls"><h2>Test Student</h2><button id="music">Music unlocked</button></section></main><script type="module">
      let time=10000, serial=0; const jobs=new Map();
      Date.now=()=>time;
      window.setTimeout=(fn,ms=0)=>{const id=++serial;jobs.set(id,{fn,at:time+ms});return id;};
      window.clearTimeout=id=>jobs.delete(id);
      window.advance=ms=>{const end=time+ms;for(;;){const next=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;jobs.delete(next[0]);next[1].fn();}time=end;};
      window.sleepClock=ms=>{time+=ms;};
      const {parentActionFeedback}=await import('/cloud-action-feedback.js');
      window.feedback=parentActionFeedback();
      window.slot=key=>document.querySelector('[data-action-feedback="'+key+'"]');
      window.toast=document.getElementById('cloud-action-toast');
      window.success=key=>{const ticket=feedback.begin(key,'Saving…');feedback.finish(ticket,key+' unlocked','Saved for today. Daily time limits still apply.');return ticket;};
      for(const key of ['music','video','screen'])feedback.mount(document.getElementById('controls'),key);
      window.ready=true;
    </script></body></html>`); return;
  }
  if (['/cloud-action-feedback.js', '/cloud-monitoring.css'].includes(req.url)) {
    res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(fs.readFileSync(path.join(site, 'public/guard-admin', req.url.slice(1)))); return;
  }
  res.writeHead(404); res.end();
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run() {
  await app.whenReady(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({cancel:!details.url.startsWith(origin)}));
  const win = new BrowserWindow({show:false,width:900,height:850,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const js = source => win.webContents.executeJavaScript(source, true);
  await win.loadURL(origin);
  for (let i=0; !(await js('window.ready')) && i<50; i++) await delay(50);
  assert.equal(await js('window.ready'),true);
  // Inline success and the popup fade, release their space, and stay gone after refresh.
  await js("success('music');advance(6400);feedback.render()");
  assert.equal(await js("slot('music').hidden || toast.hidden"),false);
  assert.equal(await js("slot('music').dataset.dismissing"),'false');
  await js('advance(100)');
  assert.equal(await js("slot('music').dataset.dismissing"),'true');
  assert.equal(await js('toast.dataset.dismissing'),'true');
  assert.equal(await js("getComputedStyle(slot('music')).transitionDuration"),'0.2s');
  for(let i=0; (await js("getComputedStyle(slot('music')).opacity"))!=='0' && i<20; i++) await delay(50);
  assert.equal(await js("getComputedStyle(slot('music')).opacity"),'0');
  await js('advance(200);feedback.render()');
  assert.equal(await js("slot('music').hidden && toast.hidden"),true);
  await js("slot('music').remove();feedback.mount(document.getElementById('controls'),'music');feedback.render()");
  assert.equal(await js("slot('music').hidden"),true,'remount must not revive expired entries');
  // Staggered controls each expire; a pending or failed request never silently disappears.
  await js("success('music');advance(3000);success('video');window.pending=feedback.begin('screen','Requesting screenshot');advance(3700)");
  assert.equal(await js("slot('music').hidden && !slot('video').hidden && !slot('screen').hidden"),true);
  await js('advance(10000)');
  assert.equal(await js("slot('video').hidden && slot('screen').dataset.state==='pending'"),true);
  await js("feedback.finish(pending,'Screenshot request failed','Try again when connected.',true);advance(60000)");
  assert.equal(await js("!slot('screen').hidden && !toast.hidden && toast.getAttribute('role')==='alert'"),true);
  // An old success timer or late response cannot erase/replace a newer request.
  await js("success('music');advance(6400);window.newTicket=feedback.begin('music','Saving new change');advance(1000)");
  assert.equal(await js("slot('music').dataset.state"),'pending');
  await js("feedback.finish(newTicket,'New music setting');advance(6500);window.retry=feedback.begin('music','Retrying');feedback.finish(newTicket,'Obsolete response');advance(200)");
  assert.equal(await js("slot('music').textContent"),'Retrying');
  // Same-group replacement and a slower different action leave the newest toast intact.
  await js("window.old=feedback.begin('music','First','media');window.next=feedback.begin('video','Second','media');feedback.finish(old,'Old result');feedback.finish(next,'Video saved');advance(6400);window.slow=feedback.begin('screen','Slow screenshot');success('music');feedback.finish(slow,'Screenshot saved')");
  assert.equal(await js('toast.querySelector("strong").textContent'),'music unlocked');
  await js('advance(300)');
  assert.equal(await js('toast.hidden || toast.dataset.dismissing === "true"'),false,'old toast fade cannot dismiss the new action');
  // Reading the toast pauses its auto-dismissal and resumes on focus leaving.
  // Hidden/offscreen windows update activeElement but do not emit native focus events.
  await js('toast.querySelector("button").focus();toast.dispatchEvent(new FocusEvent("focusin",{bubbles:true}));advance(10000)');
  assert.equal(await js('toast.hidden'),false);
  await js('document.getElementById("music").focus();toast.dispatchEvent(new FocusEvent("focusout",{bubbles:true}));advance(6700)');
  assert.equal(await js('toast.hidden'),true);
  // A slept/background tab can refresh before queued timers execute.
  await js("success('video');sleepClock(60000);feedback.render()");
  assert.equal(await js("slot('video').hidden"),true);
  // Modal errors remain dismissible, and closing the modal clears its popup.
  await js("window.dialog=document.createElement('dialog');document.body.append(dialog);dialog.showModal();feedback.page('Check this setting.',true)");
  assert.equal(await js('toast.parentElement===dialog'),true);
  await js('toast.querySelector("button").click()');
  assert.equal(await js('toast.hidden'),true);
  await js("feedback.page('Saved');dialog.close()");await delay(50);
  assert.equal(await js('toast.hidden'),true);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await js("getComputedStyle(slot('music')).transitionDuration"),'0s');
  win.webContents.debugger.detach();
  win.setContentSize(390,844);
  await js("success('music');success('video');success('screen')");
  await delay(100);
  assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
  await js('advance(6700);feedback.render()');
  assert.equal(await js('[...document.querySelectorAll(".cloud-action-inline")].every(el=>el.hidden)'),true);
  win.destroy();
  console.log('Parent feedback passed: timed inline/popup fade, refreshed/remounted cards, staggered actions, persistent pending/errors, stale requests/timers, reading pause, suspended tab, modal dismissal, reduced motion and phone layout.');
}
run().then(()=>{server.close();app.quit();}).catch(error=>{console.error(error.stack);server.close();app.exit(1);});
