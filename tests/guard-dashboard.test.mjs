import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const filename = path.resolve('app/guard/dashboard/page.tsx');
const localRequire = createRequire(filename);
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

async function render({ authenticated = true, unavailable = false } = {}) {
  const component = new Module(filename);
  component.filename = filename;
  component.require = name => {
    if (name === '@clerk/nextjs/server') return {
      auth: async () => ({ isAuthenticated: authenticated }),
      currentUser: async () => ({ firstName: 'Jamie' }),
    };
    if (name === 'next/navigation') return { redirect: url => { throw new Error(`redirect:${url}`); } };
    if (name === './cloud-api') return { cloudApi: async () => {
      if (unavailable) throw new Error('Cloud service unavailable');
      return { students: [{ id: 'child', name: '<script>private</script>', grade: '5' }], devices: [], rules: { revision: 1, subjects: [] } };
    } };
    if (name === './actions') return new Proxy({}, { get: () => async () => {} });
    if (name === './LiveComputers') return { __esModule: true, default: () => React.createElement('div', null, 'Live computers') };
    if (name === '../SubmitButton') return { __esModule: true, default: props => React.createElement('button', { type: 'submit' }, props.children) };
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props, props.children) };
    return localRequire(name);
  };
  component._compile(compiled, filename);
  return renderToStaticMarkup(await component.exports.default({ searchParams: Promise.resolve({}) }));
}

test('cloud dashboard requires parent sign-in before fetching or rendering family data', async () => {
  await assert.rejects(render({ authenticated: false }), /redirect:.*sign-in/);
});

test('cloud dashboard hosts the shared Admin workspace without rebuilding its sidebar', async () => {
  const html = await render();
  assert.match(html, /<iframe/);
  assert.match(html, /\/guard\/dashboard\/workspace\//);
  assert.match(html, /BodeeGuard Parent Dashboard/);
  assert.doesNotMatch(html, /<aside|bodeeguard\.local|3737/);
});

test('the outer frame does not turn an API outage into an empty family snapshot', async () => {
  assert.match(await render({ unavailable: true }), /\/guard\/dashboard\/workspace\//);
});

function loadDashboardModule(relative, overrides = {}) {
  const sourcePath = path.resolve('app/guard/dashboard', relative);
  const scopedRequire = createRequire(sourcePath);
  const component = new Module(sourcePath);
  component.filename = sourcePath;
  component.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === './actions') return { createCloudRecoveryCode: async () => ({ error: 'Not invoked in render tests' }) };
    if (name === './RecoveryCode') return { __esModule: true, default: loadDashboardModule('RecoveryCode.tsx').default };
    if (name === '../SubmitButton') return { __esModule: true, default: props => React.createElement('button', { type: 'submit' }, props.children) };
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    return scopedRequire(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sourcePath);
  return component.exports;
}

test('live computer cards clearly distinguish pilot school pause, recovery, and received minutes', () => {
  const View = loadDashboardModule('LiveComputers.tsx').default;
  const html = renderToStaticMarkup(React.createElement(View, { initial: {
    serverTime: '2026-09-05T12:00:30Z', students: [{ id: 'student', name: 'Test child' }],
    devices: [{ id: 'device', computer_name: 'Pilot', student_id: 'student', last_seen_at: '2026-09-05T12:00:00Z', revision: 2, acknowledged_revision: 2, app_version: 'test', current_subject: 'subject' }],
    rules: { subjects: [{ id: 'subject', title: 'School lesson' }] },
    activity: [{ student_id: 'student', subject_id: 'subject', date_utc: '2026-09-05', seconds: 90 }],
  } }));
  assert.match(html, /Pause cloud school/);
  assert.match(html, /Offline parent recovery/);
  assert.match(html, /1m 30s/);
  assert.match(html, /not verified lesson completion/);
  assert.doesNotMatch(html, /Lock computer/);
});

test('anonymous status polling is 401 and never calls the household API', async () => {
  let called = false;
  const route = loadDashboardModule('status/route.ts', {
    '@clerk/nextjs/server': { auth: async () => ({ isAuthenticated: false }) },
    '../cloud-api': { cloudApi: async () => { called = true; } },
  });
  const response = await route.GET();
  assert.equal(response.status, 401);
  assert.equal(called, false);
});
