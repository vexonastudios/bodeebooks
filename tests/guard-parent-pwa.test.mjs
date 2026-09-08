import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function worker(fetch) {
  const handlers = new Map();
  vm.runInNewContext(fs.readFileSync('public/guard-parent-sw.js', 'utf8'), {
    self: { location: { origin: 'https://guard.bodeebooks.com' }, addEventListener: (name, fn) => handlers.set(name, fn) },
    fetch, Response, URL
  });
  return request => { let response; handlers.get('fetch')({ request, respondWith: promise => { response = promise; } }); return response; };
}
test('parent navigation uses the network, retaining authentication failures without caching them', async () => {
  const response = new Response('Sign in', { status: 401 }); let sent;
  const handle = worker(async request => { sent = request; return response; });
  const request = { url: 'https://guard.bodeebooks.com/dashboard/', method: 'GET', mode: 'navigate' };
  assert.equal(await handle(request), response); assert.equal(sent, request);
});
test('offline launch shows a reconnect page and leaves API requests and commands untouched', async () => {
  const handle = worker(async () => { throw new TypeError('offline'); });
  const response = await handle({ url: 'https://guard.bodeebooks.com/dashboard/', method: 'GET', mode: 'navigate' });
  assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /You’re offline/);
  assert.equal(handle({ url: 'https://guard.bodeebooks.com/guard/dashboard/bridge/', method: 'POST', mode: 'same-origin' }), undefined);
  assert.equal(handle({ url: 'https://guard.bodeebooks.com/guard/dashboard/bridge/', method: 'GET', mode: 'same-origin' }), undefined);
  assert.equal(handle({ url: 'https://other.example/dashboard/', method: 'GET', mode: 'navigate' }), undefined);
});
test('home-screen manifest starts at the parent dashboard and includes the existing mobile icons', () => {
  const manifest = JSON.parse(fs.readFileSync('public/guard-parent.webmanifest', 'utf8'));
  assert.equal(manifest.start_url, '/dashboard/'); assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const data = fs.readFileSync('public' + icon.src);
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(data.readUInt32BE(16), width); assert.equal(data.readUInt32BE(20), height);
  }
});
