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

test('registration is clean and does not use Telegram ForceReply', () => {
  const source = readRoute();
  assert.doesNotMatch(source, /force_reply/);
  assert.match(source, /telegram_registration_sessions/);
  assert.match(source, /first_name/);
  assert.match(source, /last_name/);
});

test('registration copy is polished and concise', () => {
  const source = readRoute();
  assert.match(source, /Platformadan foydalanishni boshlash uchun qisqa ro‘yxatdan o‘ting/);
  assert.match(source, /Ismingizni yozing\./);
  assert.match(source, /Familiyangizni yozing\./);
  assert.match(source, /Ma’lumotlaringizni tekshiring/);
  assert.match(source, /Siz endi <b>Ark Education \| English<\/b> platformasidan foydalanishingiz mumkin/);
});

test('registration messages have generous spacing between content blocks', () => {
  const source = readRoute();
  const doubleBlankBlocks = source.match(/"",\n\s*"",/g) || [];
  assert.ok(doubleBlankBlocks.length >= 4, 'registration copy should use double blank lines between major blocks');
});

test('Rustam Usmonov can bootstrap the first active super admin', () => {
  const source = readRoute();
  assert.match(source, /Rustam/i);
  assert.match(source, /Usmonov/i);
  assert.match(source, /admins/);
  assert.match(source, /super_admin/);
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
