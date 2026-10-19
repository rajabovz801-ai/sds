import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

function compile(path, dependencies = {}) {
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name) => Object.prototype.hasOwnProperty.call(dependencies, name) ? dependencies[name] : require(name),
    module, module.exports
  );
  return module.exports;
}

const policy = compile('lib/mock-access-policy.ts');
function routeFor(authenticated = true) {
  const student = {id: 'example-student', username: 'example-student'};
  const membership = {
    enforced: true, mock_dates: ['2026-10-25'], challenge_until: null,
    trial_eligible: false, pending: false, had_paid: true
  };
  return compile('app/api/billing/route.ts', {
    'next/server': {NextResponse: {json: (data, options = {}) =>
      new Response(JSON.stringify(data), {status: options.status || 200,
        headers: {'Content-Type': 'application/json'}})}},
    '@/lib/ark60-content-auth': {
      getStudent: async () => authenticated ? student : null,
      membershipForStudent: async () => membership,
      isDayUnlocked: async () => false,
      isPreview: () => false,
      todayInTashkent: () => '2026-10-19'
    },
    '@/lib/mock-access-policy': policy,
    '@/lib/billing/server': {hasCompletedResult: async () => false},
    '@/lib/supabase/server': {getServiceSupabase: () => {throw Error('GET access should not touch Supabase tables');}},
    '@/lib/billing/plans': {BILLING_PLANS: [], isBillingMethod: () => false, isBillingPlan: () => false, PLAN_LOOKUP: {}}
  });
}
async function check(route, day, module) {
  const search = new URLSearchParams({action: 'access', day: String(day), module});
  const response = await route.GET({nextUrl: new URL('https://example.test/api/billing?' + search)});
  return {status: response.status, data: await response.json()};
}

test('Day 18 personal-code Mock navigation bypasses only the outer subscription gate', async () => {
  const route = routeFor();
  for (const module of ['mock', '']) {
    const result = await check(route, 18, module);
    assert.equal(result.status, 200);
    assert.equal(result.data.allowed, true);
    assert.equal(result.data.code_entry_only, true);
    assert.equal(result.data.review_only, false);
  }
});

test('Personal-code exception does not unlock a different module or any other mock', async () => {
  const route = routeFor();
  for (const [day, module] of [[18, 'reading'], [18, 'listening'], [11, 'mock'], [25, 'mock']]) {
    const result = await check(route, day, module);
    assert.equal(result.data.allowed, false, 'Unexpected study access on day ' + day + ' ' + module);
    assert.equal(result.data.code_entry_only, false);
  }
});

test('Unauthenticated users cannot reach the personal-code gate', async () => {
  const result = await check(routeFor(false), 18, 'mock');
  assert.equal(result.status, 401);
});

test('Exam content remains behind the separate personal-code check', () => {
  const api = fs.readFileSync('app/api/challenge-mock/route.ts', 'utf8');
  assert.match(api, /const entry=await mockEntryForStudent\(day,viewer\)/);
  assert.match(api, /if\(entry==="code_required"\)return json\(\{detail:/);
  assert.match(api, /src=await source\(day,true\)/);
});
