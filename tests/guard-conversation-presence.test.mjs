import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {createConversationPresence}=await import('data:text/javascript;base64,'+fs.readFileSync('app/guard/dashboard/conversation-presence.js').toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({blocked=false}={}) {
  const calls=[],timers=new Map();let visible=true,number=0,release;
  const browser={crypto:{randomUUID:()=> 'window-id'},setTimeout:(work,ms)=>{timers.set(++number,{work,ms});return number;},clearTimeout:id=>timers.delete(id)};
  const presence=createConversationPresence({browser,isVisible:()=>visible,send:async(studentId,viewId)=>{
    calls.push({studentId,viewId});if(blocked){blocked=false;await new Promise(resolve=>release=resolve);}return true;
  }});
  return {presence,calls,timers,hide:()=>visible=false,show:()=>visible=true,release:()=>release(),tick:async()=>{
    const [id,timer]=timers.entries().next().value;timers.delete(id);assert.equal(timer.ms,15000);timer.work();await settle();
  }};
}
test('only the selected visible child heartbeats; hiding releases and resuming renews the same window lease',async()=>{
  const f=fixture();f.presence.set('child-a');await settle();assert.deepEqual(f.calls,[{studentId:'child-a',viewId:'window-id'}]);
  await f.tick();assert.equal(f.calls.length,2);
  f.hide();f.presence.refresh();await settle();assert.equal(f.calls.at(-1).studentId,null);assert.equal(f.timers.size,0);
  f.presence.refresh();await settle();assert.equal(f.calls.length,3);
  f.show();f.presence.refresh();await settle();assert.equal(f.calls.at(-1).studentId,'child-a');
  f.presence.set('child-b');await settle();assert.equal(f.calls.at(-1).studentId,'child-b');
  f.presence.set(null);await settle();assert.equal(f.calls.at(-1).studentId,null);assert.equal(f.timers.size,0);
});
test('rapid switches are serialized and a slow heartbeat always finishes before the final account/page disposal clear',async()=>{
  const f=fixture({blocked:true});f.presence.set('child-a');f.presence.set('child-b');f.presence.dispose();
  assert.deepEqual(f.calls,[{studentId:'child-a',viewId:'window-id'}]);f.release();await settle();
  assert.deepEqual(f.calls,[{studentId:'child-a',viewId:'window-id'},{studentId:null,viewId:'window-id'}]);assert.equal(f.timers.size,0);
  f.presence.set('child-c');await settle();assert.equal(f.calls.length,2);
});
test('failed presence calls retain no infinite suppression and a later heartbeat retries',async()=>{
  const timers=new Map(),calls=[];let fail=true,id=0;
  const presence=createConversationPresence({isVisible:()=>true,browser:{crypto:{randomUUID:()=> 'window-id'},setTimeout:(cb,ms)=>{timers.set(++id,{cb,ms});return id;},clearTimeout:key=>timers.delete(key)},
    send:async student=>{calls.push(student);if(fail)throw Error('offline');return true;}});
  presence.set('child');await settle();assert.equal(timers.size,1);
  fail=false;timers.values().next().value.cb();await settle();assert.deepEqual(calls,['child','child']);
  presence.dispose();await settle();assert.equal(calls.at(-1),null);assert.equal(timers.size,0);
});
test('a page that starts hidden never publishes an active conversation',async()=>{
  const f=fixture();f.hide();f.presence.set('child');await settle();assert.deepEqual(f.calls,[{studentId:null,viewId:'window-id'}]);assert.equal(f.timers.size,0);
});
