import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

function load(relative, overrides = {}) {
  const filename = path.resolve(relative), localRequire = createRequire(filename), component = new Module(filename);
  component.filename = filename;
  component.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === './navigation') return load('app/guard/dashboard/navigation.ts');
    if (name === './visible-viewport') return load('app/guard/dashboard/visible-viewport.ts');
    return localRequire(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return component.exports;
}
const { dashboardQuery } = load('app/guard/dashboard/navigation.ts');
const conversation = '11111111-1111-4111-8111-111111111111';
test('dashboard destinations retain only supported setup and conversation choices', () => {
  assert.equal(dashboardQuery({ setup: 'connect' }), '?setup=connect');
  assert.equal(dashboardQuery({ setup: '1', conversation }), '?setup=1&conversation=' + conversation);
  assert.equal(dashboardQuery({ setup: ['connect', '1'], conversation: ['bad'] }), '');
  assert.equal(dashboardQuery({ setup: 'https://foreign.invalid', conversation: '<script>' }), '');
});
function page(authenticated = true) {
  return load('app/guard/dashboard/page.tsx', {
    '@clerk/nextjs/server': { auth: async () => ({ isAuthenticated: authenticated }) },
    'next/navigation': { redirect: url => { throw new Error(url); } },
    './ParentWorkspace': { __esModule: true, default: ({ query }) => React.createElement('iframe', { src: '/guard/dashboard/workspace/' + query }) },
    ...Object.fromEntries(['ParentPwa', 'ParentUpdate', 'ParentNotifications'].map(name => ['./' + name, { __esModule: true, default: () => null }])),
  }).default;
}
test('pairing link reaches the inner dashboard and survives server sign-in', async () => {
  const html = renderToStaticMarkup(await page()({ searchParams: Promise.resolve({ setup: 'connect' }) }));
  assert.match(html, /src="\/guard\/dashboard\/workspace\/\?setup=connect"/);
  await assert.rejects(page(false)({ searchParams: Promise.resolve({ setup: 'connect' }) }), error => error.message === '/guard/sign-in?redirect_url=' + encodeURIComponent('/guard/dashboard/?setup=connect'));
});
test('ready client workspace passes the selected destination into its real iframe', () => {
  const Workspace = load('app/guard/dashboard/ParentWorkspace.tsx', {
    '@clerk/nextjs': { useAuth: () => ({ getToken: async () => 'fixture', isLoaded: true }) },
    react: { ...React, useState: () => [true, () => {}] },
    'next/image': { __esModule: true, default: () => null },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Workspace, { query: '?setup=connect' }));
  assert.match(html, /src="\/guard\/dashboard\/workspace\/\?setup=connect"/);
  assert.match(html, /title="BodeeGuard Parent Dashboard"/);
  assert.match(html, /sandbox="[^"]*allow-same-origin/);
});
