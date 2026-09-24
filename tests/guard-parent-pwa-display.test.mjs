import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

function mount(standalone) {
  const filename = path.resolve('app/guard/dashboard/ParentPwa.tsx');
  const handlers = new Map(), replies = [], stateUpdates = [];
  const frame = { postMessage: (message, target) => replies.push({ message, target }) };
  const mode = { matches: standalone, addEventListener: (name, fn) => handlers.set('mode:' + name, fn), removeEventListener() {} };
  const originals = new Map(['window', 'document', 'location', 'navigator', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: { addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener() {} } },
    document: { configurable: true, value: { querySelector: () => ({ contentWindow: frame }) } },
    location: { configurable: true, value: { hostname: 'guard.bodeebooks.com', origin: 'https://guard.bodeebooks.com' } },
    navigator: { configurable: true, value: { userAgent: 'Chrome', platform: 'Win32', maxTouchPoints: 0 } },
    matchMedia: { configurable: true, value: () => mode }
  });
  let stateIndex = 0;
  const loadedModule = new Module(filename);
  loadedModule.require = name => {
    if (name === 'react') return { useRef: () => ({ current: null }), useState: initial => { const index = stateIndex++; return [initial, value => stateUpdates.push({ index, value })]; }, useEffect: effect => effect() };
    if (name === './workspace.module.css') return { default: {} };
    if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
    throw Error('Unexpected import ' + name);
  };
  loadedModule._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  loadedModule.exports.default();
  return {
    frame, mode, handlers, replies, stateUpdates,
    restore() { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  };
}

test('installed parent app tells its dashboard frame to hide install controls and ignores a stale install request', () => {
  const app = mount(true);
  try {
    app.handlers.get('message')({ origin: 'https://guard.bodeebooks.com', source: app.frame, data: { type: 'bodeeguard-pwa-state-request' } });
    assert.deepEqual(app.replies, [{ message: { type: 'bodeeguard-pwa-display', standalone: true }, target: 'https://guard.bodeebooks.com' }]);
    app.handlers.get('message')({ origin: 'https://guard.bodeebooks.com', source: app.frame, data: { type: 'bodeeguard-install' } });
    assert.equal(app.stateUpdates.some(update => update.index === 0 && update.value === true), false);
  } finally { app.restore(); }
});

test('browser tab can offer installation, and display-mode changes update the frame', () => {
  const app = mount(false);
  try {
    app.handlers.get('message')({ origin: 'https://foreign.example', source: app.frame, data: { type: 'bodeeguard-pwa-state-request' } });
    assert.equal(app.replies.length, 0);
    app.handlers.get('message')({ origin: 'https://guard.bodeebooks.com', source: app.frame, data: { type: 'bodeeguard-pwa-state-request' } });
    assert.equal(app.replies.at(-1).message.standalone, false);
    app.handlers.get('message')({ origin: 'https://guard.bodeebooks.com', source: app.frame, data: { type: 'bodeeguard-install' } });
    assert.equal(app.stateUpdates.some(update => update.index === 0 && update.value === true), true);
    app.mode.matches = true; app.handlers.get('mode:change')();
    assert.equal(app.replies.at(-1).message.standalone, true);
  } finally { app.restore(); }
});