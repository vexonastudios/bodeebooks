'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated synthetic staff UI fixture. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Fixture only');
const site=path.resolve(__dirname,'..'),out=path.join(site,'.tmp','usage-dashboard-ui');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-staff-usage-')));app.disableHardwareAcceleration();
const {webpack}=require('next/dist/compiled/webpack/webpack');
fs.writeFileSync(path.join(out,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import Usage from '${path.join(site,'app/guard/admin/UsagePanel').replaceAll('\\','/')}';import styles from '${path.join(site,'app/guard/admin/admin.module.css').replaceAll('\\','/')}';createRoot(document.getElementById('root')).render(<main className={styles.page}><span className={styles.eyebrow}>BODEEGUARD STAFF · SYNTHETIC PREVIEW</span><Usage/></main>);`);
const empty={requests:0,clientErrors:0,serverErrors:0,aborted:0,requestBytes:0,responseBytes:0,dbQueries:0,dbResultBytes:0,durationMs:0,maxResponseBytes:0,aiRequests:0,aiCostMicros:0,aiEstimatedMicros:0};
const familyA='d76383e4-d6ce-4270-8e9e-005dc0f563ca',familyB='d76383e4-d6ce-4270-8e9e-005dc0f563cb';
const features=[{...empty,feature:'sync',requests:45000,dbQueries:320000,responseBytes:12500000,durationMs:6750000},{...empty,feature:'videos',requests:3000,dbQueries:59000,serverErrors:220,responseBytes:25500000,durationMs:800000},{...empty,feature:'coloring-studio',requests:1200,dbQueries:9000,aiRequests:29,aiCostMicros:1800000,responseBytes:200000,durationMs:350000}];
const totals={...empty};for(const row of features)for(const key of Object.keys(empty))totals[key]+=row[key];
let calls=0,saves=0,revision=1,limits={requests:20000,dbQueries:100000},failNext=false,lastRequest;
function result(input){return{asOf:'2026-10-12T15:30:00Z',from:`2026-10-${input.days===1?'12':'06'}T00:00:00Z`,days:input.days,family:input.family||'',firstTracked:'2026-09-15T00:00:00Z',lastRecorded:'2026-10-12T15:29:30Z',truncated:false,warnings:[],totals,features,families:[{...totals,family:familyA,label:'Family d76383e4'},{...empty,requests:1000,family:familyB,label:'Family example B'}],daily:Array.from({length:input.days===1?1:7},(_,i)=>({...empty,date:`2026-10-${String(input.days===1?12:i+6).padStart(2,'0')}`,requests:4500+i*500,dbQueries:19000+i*2100,activeFamilies:2,responseBytes:200000+i*65000,durationMs:700000,serverErrors:i===5?40:0})),watch:{limits,revision,updatedAt:'2026-10-12T15:00:00Z'},insights:{normalized:{activeFamilies:2,requests:49200,dbQueries:388000,aiCostMicros:1800000},comparison:{date:'2026-10-11',baselineDays:7,queriesPerRequest:{current:4.2,baseline:9.8},requestsPerActiveFamily:{current:5800,baseline:6000},dbQueriesPerActiveFamily:{current:24360,baseline:58800}},signals:[],recommendations:[],budgets:Object.entries(limits).map(([metric,limit])=>({metric,limit,used:metric==='requests'?18000:120000,state:metric==='requests'?'near':'exceeded'})),today:'2026-10-12',timeZone:'UTC'},neon:{status:'connected',fetchedAt:'2026-10-12T15:00:00Z',nextRefreshAt:'2026-10-12T16:00:00Z',data:{source:'Synthetic project usage',projectId:'synthetic-project',from:'2026-10-01T00:00:00Z',to:'2026-10-12T15:00:00Z',points:1,totals:{},daily:[],summary:{computeSeconds:7200,transferBytes:1000000,storageBytes:2000000,periodEnd:'2026-11-01T00:00:00Z'}}}};}
const server=http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));return;}
 if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);res.setHeader('Content-Type','application/json');
  if(input.action==='usage'){calls++;lastRequest=input;if(failNext){failNext=false;res.writeHead(503);res.end(JSON.stringify({error:'Synthetic monitoring outage. Refresh to retry.'}));return;}res.end(JSON.stringify(result(input)));return;}
  if(input.action==='usage-limits'){assert.equal(input.revision,revision);saves++;limits=input.limits;revision++;res.end(JSON.stringify({limits,revision}));return;}
  res.writeHead(400);res.end('{}');return;
 }
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;--font-inter:Arial}</style><div id="root"></div><script src="/bundle.js"></script>');
});
let win;const watchdog=setTimeout(()=>{console.error('Staff usage fixture timed out');app.exit(1);},120000);
(async()=>{
 await new Promise((resolve,reject)=>{const compiler=webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js']},module:{rules:[{test:/\.(tsx?|css)$/,use:path.join(site,'tests/helpers/guard-report-loader.cjs')}]},optimization:{minimize:false}});compiler.run((e,stats)=>{compiler.close(()=>{});if(e||stats.hasErrors())reject(e||Error(stats.toString({all:false,errors:true})));else resolve();});});
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1100,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 const errors=[];win.webContents.on('console-message',(_e,_level,message)=>{if(/Uncaught|Minified React error/.test(message))errors.push(message);});
 const js=code=>win.webContents.executeJavaScript(code,true);
 const until=async(code,label)=>{const end=Date.now()+10000;while(Date.now()<end){if(await js(code))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out '+label);};
 const tap=label=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(label)});b.click();})()`);
 await win.loadURL(origin);await until('document.body.textContent.includes("Active families")','initial usage');assert.equal(calls,1);assert.equal(await js("[...document.querySelectorAll('h2')].filter(el=>el.textContent.trim()==='Daily watch limits').length"),1,'one shared limits panel with connected Neon');
 for(const width of [320,390,768,1440]){win.setContentSize(width,1100);await new Promise(r=>setTimeout(r,70));assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true,'no page overflow '+width);}
 win.setContentSize(1440,1100);await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'staff-usage-desktop.png'),(await win.webContents.capturePage()).toPNG());
 win.setContentSize(390,844);await js('scrollTo(0,0)');await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'staff-usage-mobile.png'),(await win.webContents.capturePage()).toPNG());
 const before=calls;await tap('Server errors');await tap('API transfer');assert.equal(calls,before,'charts do not fetch');
 await js("(()=>{const d=[...document.querySelectorAll('details')].find(d=>d.textContent.includes('Configure shared staff limits'));d.open=true;const input=d.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'22000');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
 await tap('Save watch limits');await until('document.body.textContent.includes("22,000")','saved limit');assert.equal(saves,1);assert.equal(limits.requests,22000);assert.equal(calls,before+1);
 await js("(()=>{const el=[...document.querySelectorAll('select')][1];el.value='"+familyA+"';el.dispatchEvent(new Event('change',{bubbles:true}));})()");await until('document.body.textContent.includes("selected family")','family');assert.equal(lastRequest.family,familyA);assert.equal(await js('document.body.textContent.includes("Save watch limits")'),false);
 await tap('All families');await until('document.body.textContent.includes("Daily watch limits")','all families');
 failNext=true;await tap('Refresh usage');await until('document.body.textContent.includes("Synthetic monitoring outage")','outage');assert.equal(await js('document.body.textContent.includes("Active families")'),false,'failed request cannot masquerade as fresh data');
 await tap('Refresh usage');await until('document.body.textContent.includes("Active families")','recovery');
 assert.deepEqual(errors,[]);console.log('PASS staff usage: responsive 320/390/768/1440, local charts, shared limit save, family drill-down, outage and recovery. Screenshots: '+out);
 win.destroy();await new Promise(resolve=>server.close(resolve));clearTimeout(watchdog);app.exit(0);
})().catch(error=>{console.error(error);clearTimeout(watchdog);win?.destroy();server.close();app.exit(1);});
