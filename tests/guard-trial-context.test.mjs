import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
function load(file, mocks = {}) {
  const filename = path.resolve(file), compiled = new Module(filename), localRequire = createRequire(filename);
  compiled.require = name => name === 'server-only' ? {} : mocks[name] || localRequire(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS} }).outputText, filename);
  return compiled.exports;
}
const { trialContextHeaders } = load('shared/guard-trial-context.ts');
const secret = 'synthetic-trial-secret-not-a-real-key-12345';
test('trial context signs the platform IP and authenticated token; ignores spoofable custom headers', () => {
  const incoming = new Headers({'x-vercel-forwarded-for':'203.0.113.1','x-forwarded-for':'203.0.113.9','x-bg-trial-ip':'203.0.113.8'});
  const now = 1793793600000, result = trialContextHeaders(incoming, 'synthetic', {VERCEL:'1',CLERK_SECRET_KEY:secret}, now);
  assert.equal(result['x-bg-trial-ip'], '203.0.113.1');
  assert.equal(result['x-bg-trial-signature'], crypto.createHmac('sha256',secret).update(['bodeeguard-trial-context-v1',String(now),'203.0.113.1','Bearer synthetic'].join('\n')).digest('hex'));
  assert.notEqual(result['x-bg-trial-signature'], trialContextHeaders(incoming,'other-parent',{VERCEL:'1',CLERK_SECRET_KEY:secret},now)['x-bg-trial-signature']);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
});
test('missing platform identity or secret cannot silently bypass network checks in production', () => {
  for (const ip of ['', 'bad', '203.0.113.1,203.0.113.2']) assert.throws(() => trialContextHeaders(new Headers({'x-vercel-forwarded-for':ip}), 'token', {VERCEL:'1',CLERK_SECRET_KEY:secret}));
  assert.throws(() => trialContextHeaders(new Headers({'x-vercel-forwarded-for':'203.0.113.1'}), 'token', {VERCEL:'1'}));
  assert.equal(trialContextHeaders(new Headers(), 'test', {CLERK_SECRET_KEY:secret})['x-bg-trial-ip'], '127.0.0.1');
});
test('only trial start adds signed context; other account actions need no new check and failure stays retryable', async () => {
  const before = {fetch:globalThis.fetch,api:process.env.BODEEGUARD_COMMERCIAL_API_URL};
  const calls = []; let headerReads = 0, fail = false;
  try {
    process.env.BODEEGUARD_COMMERCIAL_API_URL='https://api.example.test';
    globalThis.fetch = async (url, options) => { calls.push({url,options}); return {ok:!fail,json:async()=>fail?{error:'Please try again in 2 minutes.'}:{started:true,url:'https://checkout.example.test'}}; };
    const actions = load('app/guard/actions.ts', {
      '@clerk/nextjs/server':{auth:async()=>({isAuthenticated:true,getToken:async()=>'synthetic'})},
      'next/navigation':{redirect:url=>{throw Object.assign(Error('redirect'),{url});}},
      'next/headers':{headers:async()=>{headerReads++; return new Headers({'x-vercel-forwarded-for':'203.0.113.1'});}},
      '../../shared/guard-trial-context':{trialContextHeaders:(headers,token)=>trialContextHeaders(headers,token,{VERCEL:'1',CLERK_SECRET_KEY:secret})}
    });
    await assert.rejects(actions.startBodeeGuardTrial(), error=>error.url==='/guard/account?trial=started');
    assert.ok(calls[0].options.headers['x-bg-trial-signature']);
    await assert.rejects(actions.subscribeToBodeeGuard(), error=>error.url==='https://checkout.example.test');
    assert.equal(calls[1].options.headers['x-bg-trial-signature'], undefined); assert.equal(headerReads,1);
    fail = true;
    await assert.rejects(actions.startBodeeGuardTrial(), error=>error.url===('/guard/account?billingError='+encodeURIComponent('Please try again in 2 minutes.')));
    fail = false;
    await assert.rejects(actions.startBodeeGuardTrial(), error=>error.url==='/guard/account?trial=started');
  } finally {
    globalThis.fetch=before.fetch;
    if(before.api===undefined)delete process.env.BODEEGUARD_COMMERCIAL_API_URL;else process.env.BODEEGUARD_COMMERCIAL_API_URL=before.api;
  }
});
