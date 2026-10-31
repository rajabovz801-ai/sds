import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Day32 renders original contiguous notes and summary without affecting other mock days',()=>{
 const x=read('app/day/[day]/mock/page.tsx');
 assert.match(x,/day===32&&\(group\[0\]\.number===9\|\|group\[0\]\.number===27\)/);
 for(const part of ['Marc Brunel’s Tunnel','The Discovery of the Antikythera Mechanism','There were frequent floods caused by mechanical breakdowns.','This was ignored until over a year later'])assert.ok(x.includes(part));
 for(let n=9;n<=13;n++)assert.ok(x.includes('gap('+n+')'));
 for(let n=27;n<=32;n++)assert.ok(x.includes('gap('+n+')'));
});
test('Original day32 Reading input controls are readable',()=>{
 const css=read('app/day/[day]/mock/page.tsx');
 assert.match(css,/mock-r32-blank input/);
 assert.match(css,/mock-r32-original/);
});
