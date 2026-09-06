import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = path.resolve('shared/guard-domain.ts');
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { guardRoute, guardReturnPath, GUARD_ORIGIN, BOOKS_ORIGIN } = compiled.exports;

test('parent root and clean routes reuse the existing authenticated application', () => {
  assert.deepEqual(guardRoute(GUARD_ORIGIN + '/'), { kind: 'rewrite', url: GUARD_ORIGIN + '/guard/dashboard/' });
  for (const route of ['/account/', '/dashboard/', '/sign-in/', '/sign-in/factor-one/', '/sign-up/verify-email-address/', '/activate/?userCode=ABCD-1234', '/download/windows/']) {
    assert.deepEqual(guardRoute(GUARD_ORIGIN + route), { kind: 'rewrite', url: GUARD_ORIGIN + '/guard' + route });
  }
});

test('marketing, assets, embedded dashboard endpoints and lookalike hosts are not redirected', () => {
  for (const origin of [BOOKS_ORIGIN, 'https://preview.vercel.app', 'https://guard.bodeebooks.com.evil.test', 'http://guard.bodeebooks.com']) {
    for (const route of ['/', '/guard/', '/account/', '/guard/dashboard/bridge/', '/guard/dashboard/workspace/']) assert.equal(guardRoute(origin + route, 'GET', true), null);
  }
  for (const route of ['/_next/static/chunk.js', '/__clerk/test', '/guard/dashboard/bridge/', '/guard/dashboard/workspace/', '/guard/dashboard/status/', '/guard-dashboard/js/admin.js']) assert.equal(guardRoute(GUARD_ORIGIN + route, 'GET', true), null);
  assert.equal(guardRoute(GUARD_ORIGIN + '/guard/').url, BOOKS_ORIGIN + '/guard/');
});

test('old bookmarks move only after cutover and retain pairing/billing query values', () => {
  assert.equal(guardRoute(BOOKS_ORIGIN + '/guard/account/'), null);
  for (const method of ['GET', 'HEAD']) {
    assert.deepEqual(guardRoute(BOOKS_ORIGIN + '/guard/activate/?userCode=ABCD-1234', method, true), { kind: 'redirect', url: GUARD_ORIGIN + '/activate/?userCode=ABCD-1234' });
    assert.equal(guardRoute(GUARD_ORIGIN + '/guard/account/?subscription=canceled', method).url, GUARD_ORIGIN + '/account/?subscription=canceled');
  }
});

test('mutations never redirect across origins or bypass the existing bridge', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    assert.equal(guardRoute(BOOKS_ORIGIN + '/guard/account/', method, true), null);
    assert.equal(guardRoute(GUARD_ORIGIN + '/guard/account/', method, true), null);
    assert.deepEqual(guardRoute(GUARD_ORIGIN + '/dashboard/bridge/', method), { kind: 'rewrite', url: GUARD_ORIGIN + '/guard/dashboard/bridge/' });
  }
});

test('sign-in return links cannot move parents to an external or lookalike destination', () => {
  for (const value of ['https://evil.test/account/', '//evil.test/account/', 'https://guard.bodeebooks.com.evil.test/account/', 'https://user@guard.bodeebooks.com/account/', '\\evil.test', 'javascript:alert(1)', '/sign-in/', '/guard/sign-in/', '/dashboard/bridge/']) {
    assert.equal(guardReturnPath(value), '/dashboard/');
  }
  assert.equal(guardReturnPath(BOOKS_ORIGIN + '/guard/activate/?userCode=ABCD'), '/activate/?userCode=ABCD');
  const routed = guardRoute(BOOKS_ORIGIN + '/guard/sign-in/?redirect_url=' + encodeURIComponent(BOOKS_ORIGIN + '/guard/account/'), 'GET', true);
  assert.equal(new URL(routed.url).searchParams.get('redirect_url'), '/account/');
});

function loadComponent(relative, overrides) {
  const source = path.resolve(relative), component = new Module(source), localRequire = createRequire(source);
  component.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props, props.children) };
    return localRequire(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, source);
  return component.exports.default;
}

test('Clerk forms use the actual parent host paths, returning sign-in to dashboard and signup to account', async () => {
  const form = props => React.createElement('section', { 'data-form-path': props.path, 'data-return': props.fallbackRedirectUrl });
  for (const host of ['guard.bodeebooks.com', 'www.bodeebooks.com', 'localhost:3000']) {
    const Component = loadComponent('components/GuardAccountEntry.tsx', {
      '@clerk/nextjs': { SignIn: form, SignUp: form },
      'next/headers': { headers: async () => new Headers({ host }) },
      '@/shared/guard-domain': compiled.exports,
    });
    const base = host === 'guard.bodeebooks.com' ? '' : '/guard';
    for (const mode of ['sign-in', 'sign-up']) {
      const html = renderToStaticMarkup(await Component({ mode }));
      assert.ok(html.includes(`data-form-path="${base}/${mode}"`));
      assert.ok(html.includes(`data-return="${base}/${mode === 'sign-in' ? 'dashboard' : 'account'}/"`));
    }
  }
});

test('bookstore analytics are never mounted on parent domains or old parent paths', () => {
  const previous = globalThis.window;
  try {
    for (const [hostname, pathname, enabled] of [
      ['guard.bodeebooks.com', '/', false], ['guard.bodeebooks.com', '/account/', false],
      ['www.bodeebooks.com', '/guard/sign-in/', false], ['www.bodeebooks.com', '/guard/account/', false],
      ['www.bodeebooks.com', '/listen/book/', true], ['bodeebooks.com', '/', true],
    ]) {
      globalThis.window = { location: { hostname } };
      const Component = loadComponent('components/PublicSiteAnalytics.tsx', {
        react: { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() },
        'next/navigation': { usePathname: () => pathname },
        'next/script': { __esModule: true, default: props => React.createElement('span', { 'data-script': props.src || props.id }) },
      });
      const html = renderToStaticMarkup(Component());
      assert.equal(html.includes('googletagmanager'), enabled);
      assert.equal(html.includes('bodee-analytics.js'), enabled);
    }
  } finally { globalThis.window = previous; }
});
