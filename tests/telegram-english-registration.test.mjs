import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routePath = new URL('../app/api/telegram/english/route.js', import.meta.url);
const setup = fs.readFileSync(new URL('../app/api/telegram/setup/route.js', import.meta.url), 'utf8');

function readRoute() {
  assert.equal(fs.existsSync(routePath), true, 'Ark English Telegram route must exist');
  return fs.readFileSync(routePath, 'utf8');
}

test('Teddy uses Ark Education | English registration copy', () => {
  const source = readRoute();
  assert.match(source, /Ark Education \| English/);
  assert.match(source, /Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi/);
  assert.match(source, /Platformaga kirish/);
  assert.match(source, /english_reg_confirm/);
  assert.match(source, /english_reg_edit/);
});

test('private users are kept out of the legacy AI route', () => {
  const source = readRoute();
  assert.match(source, /AI private replies are intentionally disabled/);
  assert.match(source, /sendPrivatePlatformFallback/);
});

test('Telegram setup points Teddy webhook to the English entry route', () => {
  assert.match(setup, /\/api\/telegram\/english/);
});

test('Teddy registration does not depend on BOT_REGISTRATION_SECRET at runtime', () => {
  const source = readRoute();
  assert.doesNotMatch(source, /BOT_REGISTRATION_SECRET/);
  assert.match(source, /performStudentAccess/);
});
