import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('IELTS dashboard only counts the new visible Reading and Listening library', () => {
  const source = read('lib/dashboard.ts');
  assert.match(source, /tests!inner\([^)]*mock_only[^)]*test_collection/s);
  assert.match(source, /\.eq\('tests\.track',\s*'ielts'\)/);
  assert.match(source, /\.eq\('tests\.mock_only',\s*false\)/);
  assert.match(source, /\.in\('tests\.skill',\s*\['reading',\s*'listening'\]\)/);
});

test('IELTS progress only returns attempts from the new visible library', () => {
  const source = read('lib/progressAttempts.ts');
  assert.match(source, /tests!inner\([^)]*mock_only[^)]*test_collection/s);
  assert.match(source, /\.eq\('tests\.track',\s*'ielts'\)/);
  assert.match(source, /\.eq\('tests\.mock_only',\s*false\)/);
  assert.match(source, /\.in\('tests\.skill',\s*\['reading',\s*'listening'\]\)/);
});

test('student login is Google-only and has no Telegram/code UI', () => {
  const source = read('components/LoginClient.tsx');
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider:\s*'google'/);
  assert.doesNotMatch(source, /Telegram bot|login-code|one-time-code|6 xonali/);
});

test('home page is a minimal splash instead of a marketing landing page', () => {
  const source = read('app/page.tsx');
  assert.match(source, /SplashGate/);
  assert.doesNotMatch(source, /arkIeltsHero|arkPracticeVision|Testlarni boshlash/);
});

test('Google callback can create the ARK session only from a verified Google identity', () => {
  const source = read('app/api/auth/google/route.ts');
  assert.match(source, /auth\.getUser/);
  assert.match(source, /providers/);
  assert.match(source, /google/);
  assert.match(source, /auth_user_id/);
  assert.match(source, /SESSION_COOKIE/);
});

test('client callback exchanges OAuth code then syncs the ARK session', () => {
  const source = read('components/SplashGate.tsx');
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /\/api\/auth\/google/);
  assert.match(source, /router\.replace\('\/mock'\)/);
});
