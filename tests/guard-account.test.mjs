import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

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
  assert.doesNotMatch(html, /No computers connected yet|Not subscribed/);
});

test('closed enrollment does not offer a ticking trial or an unusable download', async () => {
  const html = await render(fixture());
  assert.match(html, /Welcome, Jamie Test/);
  assert.match(html, /Family enrollment has not opened yet/);
  assert.doesNotMatch(html, /Start 30-day trial — no card|Download for Windows|Owner-only release controls/);
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
      version: '1.2.157',
      downloadUrl: 'https://github.com/vexonastudios/bodeeguard-stable-releases/releases/download/v1.2.157/BodeeGuard-Setup-1.2.157.exe',
      notesUrl: 'https://github.com/vexonastudios/bodeeguard-stable-releases/releases/tag/v1.2.157',
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
  assert.match(html, /<details[^>]*><summary>What changed in 1\.2\.157<\/summary>/);
  assert.match(html, /Math help, safer assessments, and dependable time limits/);
  assert.match(html, /For parents/);
  assert.match(html, /Completed school quizzes now have a safer way back/);
  assert.doesNotMatch(html, /github\.com/);
});
