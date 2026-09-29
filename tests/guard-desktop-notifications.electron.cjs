"use strict";
// Actual parent React UI and controller, synthetic browser push only.
(async()=>{
const { app, BrowserWindow } = (await import('electron')).default;
const assert = (await import('node:assert/strict')).default;
const fs = await import('node:fs'), path = await import('node:path'), os = await import('node:os'), http = await import('node:http');
const ts = (await import('typescript')).default;
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-desktop-alerts-')));
const site = path.resolve(__dirname, '..'), modules = {};
const packageFile = (name, file) => fs.readFileSync(path.join(path.dirname(require.resolve(name + '/package.json')), file), 'utf8');
modules.react = packageFile('react', 'cjs/react.production.js');
modules['react/jsx-runtime'] = packageFile('react', 'cjs/react-jsx-runtime.production.js');
modules['react-dom'] = packageFile('react-dom', 'cjs/react-dom.production.js');
modules['react-dom/client'] = packageFile('react-dom', 'cjs/react-dom-client.production.js');
modules.scheduler = packageFile('scheduler', 'cjs/scheduler.production.js');
for (const name of ['ParentNotifications.tsx', 'parent-notifications-client.js', 'conversation-presence.js']) {
  const id = name === 'ParentNotifications.tsx' ? 'component' : './' + name;
  modules[id] = ts.transpileModule(fs.readFileSync(path.join(site, 'app/guard/dashboard', name), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
}
modules['@clerk/nextjs'] = "exports.useAuth=()=>({userId:'fixture-parent',isLoaded:true});";
modules['./NotificationReply'] = 'exports.__esModule=true;exports.default=()=>null;';
modules['./workspace.module.css'] = 'exports.__esModule=true;exports.default=new Proxy({},{get:(_,key)=>key});';
modules['lucide-react'] = `const React=require('react');for(const name of ['Bell','BellOff','Send','X','Smartphone','Save','AlertTriangle'])exports[name]=props=>React.createElement('svg',{...props,width:props.size||24,height:props.size||24,viewBox:'0 0 24 24'},React.createElement('circle',{cx:12,cy:12,r:8,fill:'none',stroke:'currentColor'}));`;
const bundle = Object.entries(modules).map(([id, source]) => `factories[${JSON.stringify(id)}]=function(module,exports,require){\n${source}\n};`).join('\n');
let mode = 'setup', registered = false, messagePreview = false;
const calls = [], errors = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.local');
  if (url.pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0d0d1a;color:#fff;font:16px system-ui}h1{padding:30px}.workspace{position:fixed;inset:0;background:#0d0d1a}${fs.readFileSync(path.join(site,'app/guard/dashboard/workspace.module.css'),'utf8')}</style></head><body><div class="workspace"><h1>Parent dashboard · Synthetic notification check</h1><iframe title="BodeeGuard Parent Dashboard" hidden></iframe><div id="root"></div></div><script src="/fixture.js"></script></body></html>`); return;
  }
  if (url.pathname === '/fixture.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(`const factories={},cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;if(!factories[id])throw Error('Missing fixture module '+id);factories[id](module,module.exports,require);return module.exports;}\n${bundle}\n
      const mode=${JSON.stringify(mode)}, key=new Uint8Array(65).fill(4);
      window.fixture={permissionCalls:0,subscriptions:0,unsubscriptions:0};
      if(mode!=='dismissed')localStorage.clear();
      let sub=['recovery','foreign'].includes(mode)?makeSub():null;
      function makeSub(){return {options:{applicationServerKey:key.buffer},toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-desktop',keys:{}}),unsubscribe:async()=>{fixture.unsubscriptions++;sub=null;return true;}};}
      Object.defineProperty(window,'Notification',{configurable:true,value:{permission:mode==='blocked'?'denied':mode==='recovery'||mode==='foreign'?'granted':'default',requestPermission:()=>{fixture.permissionCalls++;Notification.permission='granted';return Promise.resolve('granted');}}});
      Object.defineProperty(window,'PushManager',{configurable:true,value:{}});
      Object.defineProperty(navigator,'userAgent',{configurable:true,value:mode==='mobile'?'Android Chrome/140':'Windows Chrome/140'});
      const media=window.matchMedia.bind(window);window.matchMedia=query=>query==='(display-mode: standalone)'?{matches:true}:media(query);
      const worker={pushManager:{getSubscription:async()=>sub,subscribe:async()=>{fixture.subscriptions++;sub=makeSub();return sub;}}};
      Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{ready:Promise.resolve(worker),getRegistration:async()=>worker,controller:null,addEventListener(){},removeEventListener(){}}});
      require('react-dom/client').createRoot(document.getElementById('root')).render(require('react').createElement(require('component').default));
    `); return;
  }
  if (url.pathname === '/guard/dashboard/bridge/' && req.method === 'POST') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); calls.push(body);
    if (body.operation === 'subscribe') registered = true;
    if (body.operation === 'preview') messagePreview = body.messagePreview;
    const devices = registered || mode === 'recovery' ? [{id:'a'.repeat(64),label:'Windows · Chrome',messagePreview,revokedAt:null,lastAcceptedAt:null,lastFailure:null}] : [];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({supported:true,publicKey:Buffer.alloc(65,4).toString('base64url'),...(body.subscription?{deviceId:'a'.repeat(64)}:{}),devices,unread:[],sent:true})); return;
  }
  res.writeHead(404);res.end();
});
const until = async (win, expression) => {
  const deadline = Date.now()+10000;
  while(Date.now()<deadline){if(await win.webContents.executeJavaScript(expression))return;await new Promise(resolve=>setTimeout(resolve,50));}
  throw Error('Timed out waiting for '+expression);
};
(async()=>{
  await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const win=new BrowserWindow({width:1400,height:900,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  win.webContents.on('console-message',event=>{const message=event.message;if(/Uncaught|ReferenceError|TypeError|SyntaxError/.test(message))errors.push(message);});
  await win.loadURL(base);await until(win,"Boolean(document.querySelector('[aria-label=\"Desktop message notifications\"]'))");
  assert.equal(await win.webContents.executeJavaScript('fixture.permissionCalls'),0);
  await win.webContents.executeJavaScript("document.querySelector('[aria-label=\"Desktop message notifications\"] button').click()");
  await until(win,"Boolean(document.querySelector('dialog[open]'))&&document.querySelector('dialog').textContent.includes('On for this device')");
  assert.deepEqual(await win.webContents.executeJavaScript('({...fixture})'),{permissionCalls:1,subscriptions:1,unsubscriptions:0});
  assert.equal(calls.filter(x=>x.operation==='subscribe').length,1);
  await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Send test notification')).click()");
  await until(win,"document.querySelector('dialog').textContent.includes('Test accepted')");
  assert.equal(calls.filter(x=>x.operation==='test').length,1);
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('a[href=\"ms-settings:notifications\"]').textContent"),'Open Windows notification settings');
  assert.ok(await win.webContents.executeJavaScript("document.querySelector('[aria-label=\"Windows notification settings\"]').textContent.includes('Turn on Notifications at the top')"));
  assert.equal(await win.webContents.executeJavaScript("document.querySelectorAll('.notificationPreview').length"),1,'one preview switch for this device, never duplicated on remote devices');
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('.notificationPreview input').checked"),false);
  await win.webContents.executeJavaScript("document.querySelector('.notificationPreview input').click()");
  await until(win,"document.querySelector('.notificationPreview input').checked&&!document.querySelector('.notificationPreview input').disabled");
  assert.equal(calls.filter(x=>x.operation==='preview').length,1);assert.equal(messagePreview,true);
  fs.mkdirSync(path.join(site,'.tmp/notification-previews-20260929'),{recursive:true});
  fs.writeFileSync(path.join(site,'.tmp/notification-previews-20260929/desktop-notification-settings.png'),(await win.webContents.capturePage()).toPNG());
  mode='recovery';registered=false;calls.length=0;await win.loadURL(base);await until(win,"Boolean(localStorage.getItem('bodeeguard-phone-notifications'))");
  assert.deepEqual(await win.webContents.executeJavaScript('({...fixture})'),{permissionCalls:0,subscriptions:0,unsubscriptions:0});
  assert.deepEqual(calls.filter(x=>x.operation!=='view').map(x=>x.operation),['status','renew']);assert.ok(calls.filter(x=>x.operation==='view').every(x=>x.studentId===null));
  // Supply the trusted dashboard frame identity in this isolated UI fixture.
  await win.webContents.executeJavaScript("window.dispatchEvent(new MessageEvent('message',{origin:location.origin,source:document.querySelector('iframe').contentWindow,data:{type:'bodeeguard-phone-notifications'}}))");
  await until(win,"Boolean(document.querySelector('dialog[open]'))");
  assert.equal(await win.webContents.executeJavaScript("document.querySelector('.notificationPreview input').checked"),true);
  await win.setSize(390,844);
  assert.ok(await win.webContents.executeJavaScript("document.querySelector('dialog section').scrollWidth<=document.querySelector('dialog section').clientWidth"));
  fs.writeFileSync(path.join(site,'.tmp/notification-previews-20260929/phone-notification-settings.png'),(await win.webContents.capturePage()).toPNG());
  win.setSize(1400,900);
  mode='foreign';registered=false;calls.length=0;await win.loadURL(base);await until(win,'fixture.unsubscriptions===1');
  assert.equal(await win.webContents.executeJavaScript('fixture.subscriptions'),0);assert.ok(!calls.some(x=>x.operation==='renew'));
  mode='blocked';calls.length=0;await win.loadURL(base);await until(win,"document.body.textContent.includes('blocked for this computer')");
  assert.equal(await win.webContents.executeJavaScript('fixture.permissionCalls'),0);
  await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(x=>x.textContent==='Review').click()");await until(win,"Boolean(document.querySelector('dialog[open]'))");
  assert.ok(await win.webContents.executeJavaScript("document.querySelector('dialog').textContent.includes('If the test alert does not appear')"));
  mode='setup';registered=false;await win.loadURL(base);await until(win,"Boolean(document.querySelector('[aria-label=\"Desktop message notifications\"]'))");
  fs.writeFileSync(path.join(site,'.tmp/notification-previews-20260929/desktop-notification-setup.png'),(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("[...document.querySelectorAll('button')].find(x=>x.textContent==='Not now').click()");
  await until(win,"!document.querySelector('[aria-label=\"Desktop message notifications\"]')");
  mode='dismissed';await win.loadURL(base);await until(win,'localStorage.getItem("bodeeguard-notification-reminder")!==null');
  await new Promise(resolve=>setTimeout(resolve,200));assert.equal(await win.webContents.executeJavaScript("Boolean(document.querySelector('[aria-label=\"Desktop message notifications\"]'))"),false);
  mode='mobile';await win.loadURL(base);await until(win,"document.body.textContent.includes('Parent dashboard')");await new Promise(resolve=>setTimeout(resolve,200));
  assert.equal(await win.webContents.executeJavaScript("Boolean(document.querySelector('[aria-label=\"Desktop message notifications\"]'))"),false);
  assert.deepEqual(errors,[]);
  win.destroy();server.close();console.log('Desktop notification UI passed: explicit setup/test, approved subscription recovery, foreign rejection, blocked guidance, dismissal and mobile separation. No real permission or push changed.');app.quit();
})().catch(error=>{console.error(error);server.close();app.exit(1);});

})().catch(error=>{console.error(error);process.exit(1);});
