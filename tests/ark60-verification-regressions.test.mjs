import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Full Mock restores an expired timer as zero and only defaults missing timers',()=>{
 const page=read('app/day/[day]/mock/page.tsx');
 for(const field of ['reading_remaining','writing_remaining']){
  const expression=page.match(new RegExp('Number\\(obj\\.mock\\.'+field+'([^)]*)\\)'))?.[1];
  assert.ok(expression,'timer restore expression exists');
  const restore=new Function('value','return Number(value'+expression+')');
  assert.equal(restore(0),0);
  assert.equal(restore(75),75);
  assert.equal(restore(null),3600);
  assert.equal(restore(undefined),3600);
 }
});
test('night color generation is reproducible and excludes module-only global syntax',()=>{
 const before=read('app/night-theme.css');
 execFileSync(process.execPath,['scripts/build-night-theme.cjs'],{cwd:new URL('..',import.meta.url)});
 const generated=read('app/night-theme.css');
 assert.equal(generated,before,'checked-in theme must match generator');
 assert.doesNotMatch(generated,/:global\(/);
 assert.doesNotMatch(generated,/html\[data-ark-theme[^\]]*\]\s+html\[data-ark-theme/);
 assert.match(read('app/components/learning-ui.module.css'),/:global\(html\[data-ark-theme=dark\]\) \.entry/,'explicit module dark colors remain in their scoped stylesheet');
});
