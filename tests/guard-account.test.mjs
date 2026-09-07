import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { cloudReleaseModule, cloudReleaseFixture, legacyReleaseFixture } from './guard-release-fixtures.mjs';

// Render the real account component with isolated test identities and API data.
// No authentication bypass or fixture endpoint is added to the running website.
const filename = path.resolve('app/guard/account/page.tsx');
const localRequire = createRequire(filename);
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

async function render(account) {
  const previousFetch = globalThis.fetch;
  const previousApi = process.env.BODEEGUARD_COMMERCIAL_API_URL;
  process.env.BODEEGUARD_COMMERCIAL_API_URL = 'https://fixture.invalid/api';
  globalThis.fetch = async () => ({ ok: Boolean(account), json: async () => account });
  const component = new Module(filename);
  component.filename = filename;
  component.require = name => {
    if (name === '@clerk/nextjs/server') return {
      auth: { protect: async () => ({ getToken: async () => 'fixture-session' }) },
      currentUser: async () => ({ fullName: 'Jamie Test', publicMetadata: {}, unsafeMetadata: {}, externalAccounts: [], primaryEmailAddress: { emailAddress: 'parent@example.com' } }),
    };
    if (name === '../actions') return new Proxy({}, { get: () => async () => {} });
    if (name.endsWith('/guard-cloud-release')) return cloudReleaseModule;
    if (name === '../SubmitButton') return { __esModule: true, default: props => React.createElement('button', { className: props.className, type: 'submit' }, props.children) };
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props, props.children) };
    return localRequire(name);
  };
  try {
    component._compile(compiled, filename);
    return renderToStaticMarkup(await component.exports.default({ searchParams: Promise.resolve({}) }));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApi === undefined) delete process.env.BODEEGUARD_COMMERCIAL_API_URL;
    else process.env.BODEEGUARD_COMMERCIAL_API_URL = previousApi;
  }
}

function fixture(overrides = {}) {
  return { billingMode: 'stripe', entitlementStatus: 'inactive', releaseChannel: 'stable', release: null,
    trialEndsAt: null, graceEndsAt: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: false, hasBillingAccount: false,
    trialEligible: true, devices: [], billing: { available: true, invoices: [], plan: null, paymentMethod: null, subscription: null },
    enrollment: { customerLaunchOpen: false, canStartTrial: false, canSubscribe: false, reason: 'Family enrollment has not opened yet.' },
    ...overrides };
}

test('account outage is explicit, not an empty household or not-subscribed claim', async () => {
  const html = await render(null);
  assert.match(html, /cannot load your family account/);
  assert.doesNotMatch(html, /No child computers connected yet|Not subscribed/);
});

test('closed enrollment does not offer a ticking trial or an unusable download', async () => {
  const html = await render(fixture());
  assert.match(html, /Welcome, Jamie Test/);
  assert.match(html, /Family enrollment has not opened yet/);
  assert.doesNotMatch(html, /Start 30-day trial — no card|Download child app for Windows|Owner-only release controls/);
});

test('trial access has no cancellation, resume, or Stripe card-collection buttons', async () => {
  const html = await render(fixture({ entitlementStatus: 'trial', trialEndsAt: '2030-10-01T00:00:00Z',
    hasBillingAccount: true, cancelAtPeriodEnd: true, trialEligible: false }));
  assert.match(html, /No automatic charge/);
  assert.doesNotMatch(html, /Manage billing|Secure billing portal|View all in Stripe|Keep my subscription|Cancel at the end/);
});

test('paid subscription has renewal cancellation and does not claim trial enrollment', async () => {
  const html = await render(fixture({ entitlementStatus: 'active', hasBillingAccount: true, trialEligible: false,
    currentPeriodEndsAt: '2030-10-01T00:00:00Z' }));
  assert.match(html, /Your family subscription is active/);
  assert.match(html, /Cancel at the end of my billing period/);
  assert.doesNotMatch(html, /This family has already used its free trial|Start 30-day trial/);
});

test('ended subscription does not pretend it can be resumed before a past date', async () => {
  const html = await render(fixture({ hasBillingAccount: true, trialEligible: false, cancelAtPeriodEnd: true,
    currentPeriodEndsAt: '2025-10-01T00:00:00Z' }));
  assert.match(html, /Previous access ended/);
  assert.doesNotMatch(html, /Keep my subscription/);
});

test('external Beta requires deliberate consent; owner invite controls are restricted', async () => {
  const html = await render(fixture({ enrollment: { betaInvited: true, canChooseBeta: true, canStartTrial: false } }));
  assert.match(html, /name="betaConsent"/);
  assert.doesNotMatch(html, /Owner-only release controls/);
  const owner = await render(fixture({ billingMode: 'complimentary', entitlementStatus: 'active', releaseChannel: 'beta', releaseOperator: true }));
  assert.match(owner, /Owner-only release controls/);
  assert.match(owner, /Save Beta invitation/);
  assert.doesNotMatch(owner, /Cancel at the end of my billing period/);
});

test('release notes expand inside the account page instead of linking parents to GitHub', async () => {
  const html = await render(fixture({
    release: {
      ...cloudReleaseFixture('stable', '1.2.300'),
      notes: {
        title: 'Math help, safer assessments, and dependable time limits',
        sections: [{
          heading: 'For parents',
          headline: 'A complete Math Coach and stronger family controls',
          summary: 'This update adds parent-approved math tutoring.',
          highlights: ['Completed school quizzes now have a safer way back.']
        }]
      }
    }
  }));
  assert.match(html, /<details[^>]*><summary>What changed in 1\.2\.300<\/summary>/);
  assert.match(html, /Math help, safer assessments, and dependable time limits/);
  assert.match(html, /For parents/);
  assert.match(html, /Completed school quizzes now have a safer way back/);
  assert.doesNotMatch(html, /github\.com/);
});

test('all account states describe cloud setup without parent installation or network discovery', async () => {
  for (const overrides of [{}, { billingMode: 'complimentary', entitlementStatus: 'active' },
    { entitlementStatus: 'trial' }, { entitlementStatus: 'active' }, { entitlementStatus: 'grace' }]) {
    const html = await render(fixture(overrides));
    assert.match(html, /nothing for parents to install/);
    assert.match(html, /Open family dashboard/);
    assert.doesNotMatch(html, /Install the parent computer|Pair the parent computer|\bLAN\b|home network|Auto-Scan|3737|parent\/admin computers|First computer/);
  }
});

test('an old installer neither enables cloud downloads nor appears as a cloud update', async () => {
  const html = await render(fixture({ billingMode: 'complimentary', entitlementStatus: 'active', release: legacyReleaseFixture }));
  assert.match(html, /Cloud installer not released yet/);
  assert.match(html, /App already installed\? Approve its code/);
  assert.doesNotMatch(html, /href="\/guard\/download\/windows"|What changed in 1\.2\.157|Version 1\.2\.157/);
});

test('legacy release eligibility cannot start a trial from the cloud page', async () => {
  const html = await render(fixture({ release: legacyReleaseFixture,
    enrollment: { customerLaunchOpen: true, canStartTrial: true, canSubscribe: true } }));
  assert.doesNotMatch(html, /Start 30-day trial — no card|Subscribe for \$19\.99\/month/);
});

test('the verified account catalog must select a cloud artifact before enabling download', async () => {
  const html = await render(fixture({ entitlementStatus: 'trial', release: cloudReleaseFixture() }));
  assert.match(html, /href="\/guard\/download\/windows"/);
  assert.match(html, /Download child app for Windows/);
  assert.match(html, /Assign a child and save recovery/);
  assert.doesNotMatch(html, /Cloud installer not released yet/);
});

test('browser sessions and old parent installations are not child-device slots', async () => {
  const device = { platform: 'win32', appVersion: '1.2.300', lastSeenAt: '2030-01-01T10:00:00Z', revokedAt: null };
  const html = await render(fixture({ entitlementStatus: 'active', devices: [
    { ...device, id: 'old-parent', deviceRole: 'parent', computerName: 'Old parent' },
    { ...device, id: 'old-default', computerName: 'Old default-role installation' },
    { ...device, id: 'child-1', deviceRole: 'child', computerName: 'Learning laptop' },
    { ...device, id: 'revoked-child', deviceRole: 'child', computerName: 'Removed laptop', revokedAt: '2030-01-01T10:00:00Z' },
  ] }));
  assert.match(html, /1 of 10 child computers/);
  assert.match(html, /Learning laptop/);
  assert.match(html, /Parent browser sessions do not use child device slots/);
  assert.doesNotMatch(html, /Old parent|Old default-role installation|Removed laptop|Parent \/ admin/);
});

test('paid scheduled cancellation still offers resumption after cloud-only onboarding', async () => {
  const html = await render(fixture({ entitlementStatus: 'active', hasBillingAccount: true, trialEligible: false,
    cancelAtPeriodEnd: true, currentPeriodEndsAt: '2030-10-01T00:00:00Z' }));
  assert.match(html, /Keep my subscription/);
  assert.match(html, /Payment history/);
  assert.doesNotMatch(html, /Cancel at the end of my billing period/);
});
