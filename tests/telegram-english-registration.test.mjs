import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/api/telegram/manager/route.js', import.meta.url), 'utf8');

test('Teddy uses Ark Education | English registration copy', () => {
  assert.match(source, /Ark Education \| English/);
  assert.match(source, /Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi/);
  assert.match(source, /Platformaga kirish/);
  assert.match(source, /english_reg_confirm/);
  assert.match(source, /english_reg_edit/);
});

test('private users are kept out of the legacy AI route', () => {
  assert.match(source, /sendPrivatePlatformFallback/);
  assert.match(source, /AI private replies are intentionally disabled/);
});
