import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Day 32 admin code is independent of payment while older days still require payment confirmation',()=>{
 const a=read('app/api/mock-access/route.ts');
 assert.match(a,/input\.day===32\?input\.authorization_confirmed===true:input\.payment_confirmed===true/);
 assert.match(read('app/admin/mock/mock-code-panel.tsx'),/authorization_confirmed:day===32\?paid/);
 assert.match(read('supabase/migrations/20261031_day32_admin_grant_basis.sql'),/grant_basis IN \('payment','admin'\)/);
});
