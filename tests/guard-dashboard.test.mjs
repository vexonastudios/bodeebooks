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

test('cloud dashboard exposes supported controls, existing branding, and its migration limits', async () => {
  const html = await render();
  assert.match(html, /bodeeguard-logo\.png/);
  assert.match(html, /Jamie/);
  assert.match(html, /Add child/);
  assert.match(html, /Save school links/);
  assert.match(html, /Account &amp; billing/);
  assert.match(html, /not connected to this dashboard yet/);
  assert.match(html, /&lt;script&gt;private&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>private/);
});

test('a cloud outage shows the error rather than an apparently empty family', async () => {
  const html = await render({ unavailable: true });
  assert.match(html, /Cloud service unavailable/);
  assert.match(html, /Back to parent account/);
  assert.doesNotMatch(html, /Add child|Live computers/);
});
