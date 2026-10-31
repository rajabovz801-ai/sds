import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('Day 25 personal code opens at 09:00 Asia/Tashkent without modifying Day 18', () => {
 const access=read('lib/mock-access-policy.ts');
 assert.match(access,/day === 18 \|\| day === 25/);
 assert.match(access,/2026-10-18T09:00:00\+05:00/);
 assert.match(access,/2026-10-25T09:00:00\+05:00/);
});
test('Day 25 mock is independent of package and earlier challenge completions',()=>{
 const access=read('lib/ark60-day-access.ts');
 const dashboard=read('app/dashboard/page.tsx');
 assert.match(access,/day===18\|\|day===25\|\|day===32/);
 assert.match(dashboard,/\[18,25,32\]\.includes\(chosen\.n\)/);
});
test('Code and admin UI support Day 25 without changing other mock days',()=>{
 const admin=read('app/admin/mock/page.tsx'),gate=read('app/components/mock-access-gate.tsx');
 assert.match(admin,/\[18,25,32\]\.includes\(day\)/);
 assert.match(gate,/dateLabel\.toUpperCase\(\)/);
});
test('New Day25 assets are present for both diagrams',()=>{
 assert.ok(fs.existsSync(new URL('../public/listening/volume10-test6-education-house.svg',import.meta.url)));
 assert.ok(fs.existsSync(new URL('../public/images/mock/day25-water-filter.svg',import.meta.url)));
});
