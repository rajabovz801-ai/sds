import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Day 32 uses Nov 1, 09:00 Tashkent personal codes',()=>{
 assert.match(read('lib/mock-access-policy.ts'),/day === 32/);
 assert.match(read('lib/mock-access-policy.ts'),/2026-11-01T09:00:00\+05:00/);
 assert.match(read('lib/ark60-day-access.ts'),/day===32/);
 assert.match(read('app/dashboard/page.tsx'),/18,25,32/);
 assert.match(read('app/admin/mock/page.tsx'),/18,25,32/);
 assert.match(read('supabase/migrations/20261031_day32_personal_mock_access.sql'),/18,25,32/);
});
test('Day 32 date is November 1, no October 32 display',()=>{
 assert.equal(new Date(Date.UTC(2026,9,32)).toISOString().slice(0,10),'2026-11-01');
 assert.doesNotMatch(read('app/components/mock-access-gate.tsx'),/\{day\} OKTABR/);
 assert.doesNotMatch(read('app/admin/mock/mock-code-panel.tsx'),/\{day\}-oktabr/);
});
