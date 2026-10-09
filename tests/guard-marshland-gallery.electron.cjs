/* eslint-disable @typescript-eslint/no-require-imports -- Electron fixture runs as CommonJS. */
'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
if(app.isPackaged)throw Error('Isolated development fixture only');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bg-parent-marshland-'));app.setPath('userData',profile);
const root=path.resolve(__dirname,'..'),assets=path.join(root,'public/guard-admin');
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/cloud-games.css"></head><body style="margin:0;font-family:Arial,sans-serif;background:#101020;color:#efefff"><main id="games"></main><script type="module">import {setupCloudGames} from "/cloud-games-ui.js";window.gameTest=setupCloudGames({root:document.getElementById("games"),parent:true,assetBase:new URL("/family-games/v1/",location.href),request:async()=>({children:[],matches:[],date:"2026-10-09",timeZone:"America/Chicago"})});window.gameTest.setActive(true);</script></body></html>');return;}
 const relative=req.url.slice(1);if(!/^(?:cloud-[a-z-]+\.(?:js|css)|family-games\/v1\/[a-z-]+\.webp)$/.test(relative)){res.writeHead(404);res.end();return;}
 const file=path.join(assets,relative);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',relative.endsWith('.js')?'text/javascript':relative.endsWith('.css')?'text/css':'image/webp');res.end(fs.readFileSync(file));
});
let window;async function run(){
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));window=new BrowserWindow({show:false,width:390,height:844,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true,backgroundThrottling:false,offscreen:true}});window.setContentSize(390,844);await window.loadURL(`http://127.0.0.1:${server.address().port}/`);
 const evaluate=code=>window.webContents.executeJavaScript(code);async function wait(code){for(let i=0;i<100;i++){if(await evaluate(code))return;await new Promise(r=>setTimeout(r,30));}throw Error('UI timeout: '+code);}
 await wait('document.querySelector("[aria-label=\\"Preview Critter County Hunting\\"]")');
 assert.equal(await evaluate('document.querySelectorAll("a[href*=huntinggame-releases]").length'),0);
 assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Awaiting signed release").disabled'),true);
 await evaluate('document.querySelector("[aria-label=\\"Preview Critter County Hunting\\"]").click()');await wait('document.querySelector("dialog[open] img").naturalWidth>0');
 assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("stylized animal hunting")'),true);
 for(let i=0;i<2;i++){await evaluate('[...document.querySelectorAll("dialog[open] button")].find(b=>b.textContent==="Next picture").click()');await wait('document.querySelector("dialog[open] img").complete&&document.querySelector("dialog[open] img").naturalWidth>0');}
 assert.equal(await evaluate('document.querySelector("dialog[open] img").src.includes("marshland-clay")'),true);await evaluate('document.querySelector("dialog[open]").close()');
 for(const width of [390,320]){window.setContentSize(width,844);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true);}
 window.setContentSize(390,844);await evaluate('document.querySelector("[aria-label=\\"Preview Critter County Hunting\\"]").scrollIntoView()');await wait('document.querySelector("[aria-label=\\"Preview Critter County Hunting\\"] img").naturalWidth>0');
 await evaluate('document.querySelector("[aria-label=\\"Preview Critter County Hunting\\"] img").decode()');
 await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 // Flush queued offscreen frames after closing the preview and resizing.
 await new Promise(resolve=>setTimeout(resolve,200));
 const picture=await new Promise((resolve,reject)=>{const paint=(_event,_rect,image)=>{if(image.isEmpty()||image.getSize().width!==390)return;clearTimeout(timeout);window.webContents.removeListener('paint',paint);resolve(image);};const timeout=setTimeout(()=>{window.webContents.removeListener('paint',paint);reject(Error('Gallery screenshot did not paint'));},3000);window.webContents.on('paint',paint);window.webContents.invalidate();});
 fs.mkdirSync(path.join(root,'.tmp/marshland'),{recursive:true});const screenshot=picture.toPNG();assert.ok(screenshot.length>10000,'screenshot must contain the visible gallery');fs.writeFileSync(path.join(root,'.tmp/marshland/parent-mobile.png'),screenshot);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/workspace.json'),'utf8'));
 for(const name of ['cloud-games-catalog.js','cloud-games-ui.js'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(assets,name))).digest('hex'),manifest.hashes['renderer/js/'+name]);
 await evaluate('window.gameTest.setActive(false)');console.log('Parent Critter County Hunting gallery passed: unsigned managed downloads disabled, three real screenshots, content/saves guidance, 390/320px layout, exact export hashes.');
}
function cleanup(){window?.destroy();server.close();}
run().then(()=>{cleanup();app.quit();}).catch(e=>{console.error(e);cleanup();app.exit(1);});
