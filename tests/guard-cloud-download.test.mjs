import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { cloudReleaseModule, cloudReleaseFixture, legacyReleaseFixture } from './guard-release-fixtures.mjs';

const { cloudAccountRelease, internalPilotRelease } = cloudReleaseModule;
test('the cloud selector accepts only dedicated versioned cloud artifacts on the account channel', () => {
  for (const channel of ['beta', 'stable']) {
    const release = cloudReleaseFixture(channel);
    assert.equal(cloudAccountRelease({ releaseChannel: channel, release }), release);
    for (const invalid of [null, legacyReleaseFixture,
      { ...release, downloadUrl: release.downloadUrl + '?token=anything' },
      { ...release, downloadUrl: release.downloadUrl.replace('https:', 'http:') },
      { ...release, downloadUrl: release.downloadUrl.replace('github.com', 'github.com.evil.test') },
      { ...release, downloadUrl: release.downloadUrl.replace('cloud-child-v', 'v') },
      { ...release, downloadUrl: release.downloadUrl.replace('bodeeguard-' + channel, 'bodee-guard') },
      cloudReleaseFixture(channel, '01.2.3'), cloudReleaseFixture(channel, '1.65536.3'),
      cloudReleaseFixture(channel === 'beta' ? 'stable' : 'beta'),
      { ...release, downloadUrl: 'https://github.com/vexonastudios/bodee-guard/releases/download/private-validation-test/BodeeGuard-SIDE-BY-SIDE-VALIDATION.exe' },
    ]) assert.equal(cloudAccountRelease({ releaseChannel: channel, release: invalid }), null);
  }
  assert.equal(cloudAccountRelease({ releaseChannel: 'unknown', release: cloudReleaseFixture() }), null);
});

test('the current internal Family Beta can expose only its configured cloud test installer', () => {
  const eligible = { billingMode: 'complimentary', entitlementStatus: 'active', releaseChannel: 'beta' };
  const release = internalPilotRelease(eligible, '1.2.167');
  assert.equal(release?.version, '1.2.167');
  assert.equal(release?.downloadUrl, '/guard/download/windows');
  for (const account of [
    { ...eligible, billingMode: 'stripe' },
    { ...eligible, entitlementStatus: 'inactive' },
    { ...eligible, releaseChannel: 'stable' },
  ]) assert.equal(internalPilotRelease(account, '1.2.167'), null);
  for (const version of ['', '01.2.167', '1.2', '1.2.65536']) assert.equal(internalPilotRelease(eligible, version), null);
});

test('Family Beta notes match the configured release and keep future unknown versions generic', () => {
  const eligible = { billingMode: 'complimentary', entitlementStatus: 'active', releaseChannel: 'beta' };
  assert.match(JSON.stringify(internalPilotRelease(eligible, '1.2.239').notes), /Spelling progresses per word/);
  assert.match(JSON.stringify(internalPilotRelease(eligible, '1.2.238').notes), /Typing goals require active practice/);
  assert.doesNotMatch(JSON.stringify(internalPilotRelease(eligible, '1.2.238').notes), /Spelling progresses per word/);
  assert.equal(internalPilotRelease(eligible, '1.2.999').notes.title, 'Cloud Family Beta');
});

async function download({ account, authenticated = true, apiOk = true, failFetch = false, token = 'fixture-token', internalPilot = false, runAfter = false, metricFails = false, share = false, origin = "https://guard.bodeebooks.com", crossSite = false, body } = {}) {
  const filename = path.resolve('app/guard/download/windows/route.ts');
  const route = new Module(filename), localRequire = createRequire(filename), afterWork=[];
  route.require = name => {
    if (name === '@clerk/nextjs/server') {
      const auth = async () => ({isAuthenticated: authenticated, getToken: async () => token});
      auth.protect = async () => { if (!authenticated) throw new Error('sign-in-required'); return auth(); };
      return {auth};
    }
    if (name === 'next/server') return { after: work=>afterWork.push(work), NextResponse: { redirect: (url, init) => new Response(null, {
      status: typeof init === 'number' ? init : init.status, headers: { ...(init.headers || {}), Location: String(url) },
    }) } };
    if (name.endsWith('/guard-cloud-release')) return cloudReleaseModule;
    return localRequire(name);
  };
  const previousFetch = globalThis.fetch;
  const previousEnvironment = Object.fromEntries(['BODEEGUARD_COMMERCIAL_API_URL', 'BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION', 'BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN', 'BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET'].map(name => [name, process.env[name]]));
  const calls = [];
  process.env.BODEEGUARD_COMMERCIAL_API_URL = 'https://fixture.invalid/api';
  if (internalPilot) {
    process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION = '1.2.167';
    process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN = 'https://assets.example';
    process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET = 'synthetic-test-secret';
  } else {
    delete process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION;
    delete process.env.BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN;
    delete process.env.BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET;
  }
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/downloads') && metricFails) throw new Error('metrics unavailable');
    if (failFetch) throw new Error('service unavailable');
    return { ok: apiOk, json: async () => account };
  };
  try {
    route._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, filename);
    const response = await route.exports[share ? 'POST' : 'GET'](new Request('https://guard.bodeebooks.com/download/windows/', share ? {method: 'POST', headers: {...(origin ? {origin} : {}), 'sec-fetch-site': crossSite ? 'cross-site' : 'same-origin'}, ...(body ? {body: JSON.stringify(body)} : {})} : undefined));
    const callsBeforeResponse = calls.length;
    if(runAfter)for(const work of afterWork)await work();
    return { response, calls, callsBeforeResponse, queued:afterWork.length };
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

const active = { billingMode: 'stripe', entitlementStatus: 'trial', releaseChannel: 'stable', release: cloudReleaseFixture() };
test('download metrics run after the redirect and a metrics failure cannot block installation',async()=>{
  for(const metricFails of [false,true]){
    const {response,calls,callsBeforeResponse,queued}=await download({account:active,runAfter:true,metricFails});
    assert.equal(response.status,307);assert.equal(callsBeforeResponse,1);assert.equal(queued,1);
    assert.equal(calls[1].url,'https://fixture.invalid/api/v1/account/downloads');
    const event=JSON.parse(calls[1].init.body);assert.equal(event.version,active.release.version);assert.equal(event.channel,'stable');assert.match(event.id,/^[a-f0-9-]{36}$/);
  }
  assert.equal((await download({account:{...active,entitlementStatus:'inactive'},runAfter:true})).queued,0);
});
test('authenticated download sends no credential to GitHub and never caches the redirect', async () => {
  const { response, calls } = await download({ account: active });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), active.release.downloadUrl);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://fixture.invalid/api/v1/account');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer fixture-token');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.cache, 'no-store');
  assert.ok(calls[0].init.signal);
});

test('the internal Family Beta download is an expiring signed asset URL, not a GitHub link', async () => {
  const account = { billingMode: 'complimentary', entitlementStatus: 'active', releaseChannel: 'beta', release: null };
  const { response } = await download({ account, internalPilot: true });
  const url = new URL(response.headers.get('location'));
  assert.equal(response.status, 307);
  assert.equal(url.origin, 'https://assets.example');
  assert.equal(url.pathname, '/v1/installers/internal/BodeeGuard-Cloud-Test-1.2.167.exe');
  assert.match(url.searchParams.get('expires') || '', /^\d{10}$/);
  assert.match(url.searchParams.get('signature') || '', /^[a-f0-9]{64}$/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('legacy, missing, wrong-channel and private test installers cannot be downloaded from account links', async () => {
  for (const release of [legacyReleaseFixture, null, cloudReleaseFixture('beta'),
    { version: '1.2.162', downloadUrl: 'https://github.com/vexonastudios/bodee-guard/releases/download/private-validation-test/BodeeGuard-PRIVATE-VALIDATION.exe' }]) {
    const { response } = await download({ account: { ...active, release } });
    assert.equal(response.status, 303);
    assert.match(response.headers.get('location'), /\/guard\/account\/\?download=unavailable$/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('download keeps sign-in, entitlement and outage checks', async () => {
  await assert.rejects(() => download({ authenticated: false }), /sign-in-required/);
  const expired = await download({ account: { ...active, entitlementStatus: 'inactive' } });
  assert.match(expired.response.headers.get('location'), /download=access$/);
  for (const options of [{ apiOk: false }, { failFetch: true }, { token: null }]) {
    const { response } = await download({ account: active, ...options });
    assert.match(response.headers.get('location'), /download=unavailable$/);
  }
});

test('the public setup surfaces no longer send families to a parent installation or LAN discovery', () => {
  for (const name of ['app/guard/page.tsx', 'components/GuardAccountEntry.tsx']) {
    const source = fs.readFileSync(name, 'utf8');
    assert.doesNotMatch(source, /install on the parent computer|Set up the parent computer|\bLAN\b|home network|home Wi-Fi|local install link|2 parent\/admin|Auto-Scan/);
    assert.match(source, /nothing to install/);
  }
});


test('a parent can share the exact eligible installer without sharing their login or approving a computer', async () => {
  const account = {billingMode:'complimentary', entitlementStatus:'active', releaseChannel:'beta', release:null};
  const {response,calls} = await download({account, internalPilot:true, share:true, body:{version:'9.9.9',url:'https://untrusted.invalid',studentId:'untrusted'}});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const result=await response.json(), url=new URL(result.url);
  assert.deepEqual(Object.keys(result).sort(),['expiresAt','url','version']);
  assert.equal(result.version,'1.2.167');
  assert.equal(url.pathname,'/v1/installers/internal/BodeeGuard-Cloud-Test-1.2.167.exe');
  const expires=Number(url.searchParams.get('expires'));
  assert.ok(expires*1000>Date.now() && expires*1000<=Date.now()+300000);
  assert.equal(Date.parse(result.expiresAt),expires*1000);
  assert.equal(url.searchParams.get('signature'),createHmac('sha256','synthetic-test-secret').update(['bodeeguard-installer-download-v1','GET',url.pathname,String(expires)].join('\n')).digest('hex'));
  assert.doesNotMatch(JSON.stringify(result),/fixture-token|synthetic-test-secret|studentId|household/);
  assert.equal(calls.length,1);assert.ok(calls.every(call=>call.url.endsWith('/v1/account')));
});

test('sharing preserves sign-in, same-origin, access and release boundaries', async () => {
  for (const options of [{origin:null},{origin:'https://untrusted.invalid'},{crossSite:true}]) {
    const {response,calls}=await download({account:active,share:true,...options});
    assert.equal(response.status,403);assert.equal(calls.length,0);
  }
  const denied=await download({account:active,share:true,authenticated:false});
  assert.equal(denied.response.status,401);assert.equal(denied.calls.length,0);
  for (const options of [{account:{...active,entitlementStatus:'inactive'}},{apiOk:false},{failFetch:true},{token:null},{account:{...active,release:legacyReleaseFixture}}]) {
    const {response}=await download({account:active,share:true,...options});
    assert.ok([403,503].includes(response.status));
    assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.equal((await response.json()).url,undefined);
  }
});

test('public channel download links do not claim a false expiry or switch channels', async () => {
  const {response}=await download({account:active,share:true});
  assert.deepEqual(await response.json(),{url:active.release.downloadUrl,version:active.release.version,expiresAt:null});
});
