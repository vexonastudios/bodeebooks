// Anonymous, bounded production smoke checks. Never supplies a session, pairs a
// device, creates an account or touches a subscription. Run after domain deploys.
import assert from 'node:assert/strict';

const guard = 'https://guard.bodeebooks.com';
const books = 'https://www.bodeebooks.com';
let passed = 0;
async function check(label, run) {
  try { await run(); passed++; console.log(`PASS ${label}`); }
  catch (error) { console.error(`FAIL ${label}: ${error.message}`); process.exitCode = 1; }
}
const request = (url, options = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });

for (const path of ['/', '/account/', '/dashboard/', '/activate/']) {
  await check(`protected parent ${path}`, async () => {
    const response = await request(guard + path, { redirect: 'follow' });
    assert.equal(response.status, 200);
    assert.equal(new URL(response.url).origin, guard);
    assert.equal(new URL(response.url).pathname, '/sign-in/');
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    const html = await response.text();
    assert.ok(html.includes('clerk.bodeebooks.com'), 'Existing production identity provider must remain');
    assert.ok(html.includes('\\"path\\":\\"/sign-in\\"'), 'Clerk must use the clean form path');
  });
}
for (const path of ['/guard/account/', '/guard/dashboard/', '/guard/activate/?user_code=DOMAIN-PROBE', '/guard/sign-up/', '/guard/download/windows/']) {
  await check(`legacy bookmark ${path}`, async () => {
    const response = await request(books + path);
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location'), books).href, guard + path.slice('/guard'.length));
    await response.body?.cancel();
  });
}
for (const path of ['/guard/dashboard/bridge/', '/dashboard/bridge/']) {
  for (const [method, origin, status] of [['GET', null, 401], ['POST', guard, 401], ['POST', 'https://example.org', 403]]) {
    await check(`${method} ${path} ${origin === guard ? 'same origin' : origin ? 'foreign origin' : 'anonymous'}`, async () => {
      const response = await request(guard + path, { method, ...(origin ? { headers: { origin, 'content-type': 'application/json' }, body: '{}' } : {}) });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('location'), null);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      await response.body?.cancel();
    });
  }
}
await check('anonymous workspace remains private', async () => {
  const response = await request(guard + '/guard/dashboard/workspace/');
  assert.equal(response.status, 401);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  await response.body?.cancel();
});
for (const path of ['/', '/guard/']) {
  await check(`public bookstore ${path}`, async () => {
    const response = await request(books + path);
    assert.equal(response.status, 200);
    await response.body?.cancel();
  });
}
console.log(`${passed} checks passed. Authenticated family acceptance and billing are not exercised by this script.`);
