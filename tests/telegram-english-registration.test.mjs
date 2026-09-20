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

test('registration messages use Tarix-style compact spacing', () => {
  const source = readRoute();
  assert.doesNotMatch(source, /"",\n\s*"",/);
  assert.match(source, /Quyidagi 🚀 <b>Platformaga kirish<\/b> tugmasi orqali davom eting 👇/);
});

test('registered user copy says Practice instead of Tests', () => {
  const source = readRoute();
  assert.match(source, /Dashboard, video darslar, practice, kitoblar va reytingni platforma ichida ko‘rishingiz mumkin/);
  assert.doesNotMatch(source, /Dashboard, video darslar, testlar/);
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


test('English registration uses a dedicated enrollment marker', () => {
  const helper = fs.readFileSync(new URL('../lib/arkEnglishStudentAccess.ts', import.meta.url), 'utf8');
  assert.match(helper, /ark_english_students/);
  assert.match(helper, /enrollEnglishStudent/);
  assert.match(helper, /isEnglishEnrolled/);
});


test('Teddy registration preserves exam access for existing students and disables it only for new Teddy profiles', () => {
  const helper = fs.readFileSync(new URL('../lib/arkEnglishStudentAccess.ts', import.meta.url), 'utf8');
  const existingStart = helper.indexOf('if (student) {');
  const newStart = helper.indexOf('} else {', existingStart);
  const enrollmentStart = helper.indexOf('await enrollEnglishStudent', newStart);
  assert.ok(existingStart >= 0 && newStart > existingStart && enrollmentStart > newStart);
  const existingBlock = helper.slice(existingStart, newStart);
  const newBlock = helper.slice(newStart, enrollmentStart);
  assert.doesNotMatch(existingBlock, /exam_platform_enabled\s*:\s*false/);
  assert.match(newBlock, /exam_platform_enabled\s*:\s*false/);
});
