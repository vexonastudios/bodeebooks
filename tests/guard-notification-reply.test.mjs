import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const studentId = '11111111-1111-4111-8111-111111111111', id = '22222222-2222-4222-8222-222222222222';
function load(file, mocks = {}) {
  const filename = path.resolve(file), req = createRequire(filename), mod = new Module(filename);
  mod.require = name => mocks[name] || req(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  return mod.exports;
}
test('quick replies require same-origin JSON, current parent account, bounded content and a matching saved receipt', async () => {
  let signedIn = false, receipt, calls = [];
  const route = load('app/guard/dashboard/notification-reply/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ isAuthenticated: signedIn, userId: 'parent' }) },
    '../cloud-api': { CloudApiError: class extends Error {}, cloudApi: async (...args) => { calls.push(args); return receipt; } }
  });
  const data = { accountUserId: 'parent', studentId, id, body: 'I will be there shortly.' };
  const request = (input = data, origin = 'https://guard.example') => new Request('https://guard.example/guard/dashboard/notification-reply/', {
    method:'POST', headers: { origin, 'Content-Type':'application/json' }, body:JSON.stringify(input)
  });
  assert.equal((await route.POST(request())).status,401);
  signedIn = true;
  assert.equal((await route.POST(request(data,'https://evil.test'))).status,403);
  assert.equal((await route.POST(request({...data,accountUserId:'other-parent'}))).status,409);
  for (const input of [{...data,id:[]},{...data,studentId:[studentId]},{...data,body:' '},{...data,body:'a'.repeat(2001)}]) assert.equal((await route.POST(request(input))).status,400);
  assert.equal((await route.POST(request({...data,body:'a'.repeat(15000)}))).status,413);
  assert.equal(calls.length,0);
  receipt={ saved:true,id,studentId };
  const good=await route.POST(request({...data,householdId:'foreign',token:'ignored',fileId:'ignored'}));
  assert.equal(good.status,200); assert.equal(good.headers.get('cache-control'),'private, no-store');
  assert.equal(calls[0][0],'/messages/send'); assert.deepEqual(JSON.parse(calls[0][1].body),{studentId,id,body:data.body});
  receipt={ saved:true,id:'wrong',studentId }; assert.equal((await route.POST(request())).status,503);
});
function worker(fetch = async () => Response.json({saved:true,id,studentId})) {
  const handlers = new Map(), notifications = [], opened = [], posted = []; let tabs=[];
  const self = { crypto: { randomUUID:()=>id }, location:{origin:'https://guard.example'},
    addEventListener:(name,fn)=>handlers.set(name,fn),
    registration:{getNotifications:async()=>notifications.filter(n=>!n.closed),showNotification:async(title,options)=>{for(const n of notifications)if(n.tag===options.tag)n.closed=true;notifications.push({title,...options,close(){this.closed=true;}});}},
    clients:{matchAll:async()=>tabs,openWindow:async url=>{opened.push(url);}},navigator:{} };
  vm.runInNewContext(fs.readFileSync('public/guard-parent-sw.js','utf8'),{self,fetch,URL,Response,AbortSignal,Date,console});
  return {notifications,opened,posted,setTabs:value=>{tabs=value;},event:async(name,event)=>{let work;handlers.get(name)({...event,waitUntil:promise=>{work=promise;}});await work;}};
}
async function alert(w) { await w.event('push',{data:{json:()=>({type:'message',accountUserId:'parent',studentId,sequence:'7',unread:1,totalUnread:1})}}); return w.notifications.at(-1); }
test('notification offers inline Reply only with account binding; unsupported inline input opens the conversation',async()=>{
  const w=worker(()=>assert.fail('No reply should be sent'));const n=await alert(w);
  assert.equal(n.actions[0].type,'text');assert.equal(n.data.replyId,id);assert.ok(!n.body.includes('parent'));
  await w.event('notificationclick',{notification:n,action:'reply'});assert.match(w.opened[0],new RegExp(studentId));
  await w.event('push',{data:{json:()=>({studentId})}});assert.equal(w.notifications.at(-1).actions.length,0);
});
test('inline reply sends exactly the typed content with the saved ID and requires a matching receipt',async()=>{
  let requests=0;
  const w=worker(async(url,options)=>{
    requests++;assert.equal(url,'/guard/dashboard/notification-reply/');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    assert.deepEqual(JSON.parse(options.body),{accountUserId:'parent',studentId,id,body:'On my way'});return Response.json({saved:true,id,studentId});
  });
  const n=await alert(w);await w.event('notificationclick',{notification:n,action:'reply',reply:'On my way'});
  assert.equal(requests,1);assert.equal(w.notifications.at(-1).body,'Reply sent.');assert.equal(w.opened.length,0);
});
test('uncertain or offline send keeps a private draft and retries the SAME message ID',async()=>{
  let fail=true;const inputs=[];const w=worker(async(_url,options)=>{inputs.push(JSON.parse(options.body));if(fail)throw Error('offline');return Response.json({saved:true,id,studentId});});
  await w.event('notificationclick',{notification:await alert(w),action:'reply',reply:'Private parent reply'});
  const failed=w.notifications.at(-1);assert.equal(failed.data.pendingReply,'Private parent reply');assert.ok(!failed.body.includes('Private parent reply'));
  await w.event('notificationclick',{notification:failed,action:'open'});assert.equal(failed.closed,undefined);assert.ok(!w.opened[0].includes('Private'));
  fail=false;await w.event('notificationclick',{notification:failed,action:'retry'});assert.equal(inputs.length,2);assert.deepEqual(inputs[0],inputs[1]);assert.equal(w.notifications.at(-1).body,'Reply sent.');
});
test('expired auth or mismatched server receipt never reports a sent reply',async()=>{
  for(const response of [()=>new Response('{}',{status:401}),()=>Response.json({saved:true,id:'foreign',studentId})]){
    const w=worker(async()=>response());await w.event('notificationclick',{notification:await alert(w),action:'reply',reply:'Hello'});
    assert.match(w.notifications.at(-1).title,/needs attention/);assert.equal(w.notifications.at(-1).data.pendingReply,'Hello');
  }
});
test('concurrent notification clicks share one request',async()=>{
  let resolve,calls=0;const w=worker(()=>{calls++;return new Promise(done=>{resolve=done;});});const n=await alert(w);
  const a=w.event('notificationclick',{notification:n,action:'reply',reply:'Same'}), b=w.event('notificationclick',{notification:n,action:'reply',reply:'Same'});
  assert.equal(calls,1);resolve(Response.json({saved:true,id,studentId}));await Promise.all([a,b]);assert.equal(w.notifications.at(-1).body,'Reply sent.');
});
test('failed replies are recovered only to their parent account; expiry and explicit discard clear them',async()=>{
  const w=worker(async()=>{throw Error('offline');});await w.event('notificationclick',{notification:await alert(w),action:'reply',reply:'Preserve this'});
  const sent=[], source={url:'https://guard.example/dashboard/',postMessage:value=>sent.push(value)};
  await w.event('message',{source,data:{type:'bodeeguard-replies-resume',accountUserId:'other'}});assert.equal(sent.length,0);
  await w.event('message',{source:{...source,url:'https://evil.test/dashboard/'},data:{type:'bodeeguard-replies-resume',accountUserId:'parent'}});assert.equal(sent.length,0);
  await w.event('message',{source,data:{type:'bodeeguard-replies-resume',accountUserId:'parent'}});assert.equal(sent[0].draft.pendingReply,'Preserve this');
  await w.event('message',{source,data:{type:'bodeeguard-reply-complete',accountUserId:'other',replyId:id}});assert.ok(!w.notifications.at(-1).closed);
  await w.event('message',{source,data:{type:'bodeeguard-reply-complete',accountUserId:'parent',replyId:id}});assert.ok(w.notifications.at(-1).closed);
  const n=await alert(w);n.data.createdAt=Date.now()-86400001;await w.event('notificationclick',{notification:n,action:'reply',reply:'Expired'});assert.ok(w.opened.length);
});
test('oversized native reply is preserved for review without sending or silently truncating it',async()=>{
  const w=worker(()=>assert.fail('Oversized reply must not send'));const body='a'.repeat(2001);
  await w.event('notificationclick',{notification:await alert(w),action:'reply',reply:body});assert.equal(w.notifications.at(-1).data.pendingReply,body);
});

test('reading a conversation clears message alerts but preserves an unconfirmed quick reply',async()=>{
  const w=worker(async()=>{throw Error('offline');});await w.event('notificationclick',{notification:await alert(w),action:'reply',reply:'Keep until confirmed'});
  const draft=w.notifications.at(-1); const incoming=await alert(w);
  const source={url:'https://guard.example/dashboard/'};
  await w.event('message',{source,data:{type:'bodeeguard-conversation-read',studentId,throughSequence:'7',totalUnread:0}});
  assert.equal(incoming.closed,true);assert.ok(!draft.closed);
  await w.event('message',{source,data:{type:'bodeeguard-notifications-stop'}});assert.equal(draft.closed,true);
});

test('notification navigation waits for the authorized child list and ignores foreign windows',()=>{
  const listeners=[],posted=[],opened=[],buttons=[];let students=[];
  const parent={postMessage:value=>posted.push(value)},location={origin:'https://guard.example'};
  const messaging={openStudent:id=>opened.push(id)},navigated=[];
  const source=fs.readFileSync('public/guard-admin/cloud-notification-navigation.js','utf8').replace(/^import .*\r?\n/,'').replace('export function','function');
  const context={setupMessageUnread:()=>{},window:{parent,addEventListener:(_name,fn)=>listeners.push(fn)},location,
    document:{querySelector:()=>({after:button=>buttons.push(button)}),createElement:()=>({addEventListener(_name,fn){this.click=fn;}})}};
  vm.createContext(context);vm.runInContext(source+';this.setup=setupNotificationNavigation',context);
  const nav=context.setup({messaging,navigate:tab=>navigated.push(tab),getStudents:()=>students});
  const event={source:parent,origin:location.origin,data:{type:'bodeeguard-open-messages',studentId}};
  listeners[0]({...event,origin:'https://evil.test'});listeners[0]({...event,source:{}});assert.equal(navigated.length,0);
  listeners[0](event);assert.equal(navigated.length,0);
  students=[{id:studentId}];nav.update();assert.deepEqual(opened,[studentId]);assert.deepEqual(navigated,['messages']);
  nav.update();assert.equal(opened.length,1);assert.equal(posted.at(-1).type,'bodeeguard-message-opened');
  assert.equal(buttons.length,2);buttons[0].click();assert.equal(posted.at(-1).type,'bodeeguard-phone-notifications');
});
