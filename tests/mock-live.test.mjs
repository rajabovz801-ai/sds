import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/mock-live.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const {sanitizeMockSnapshot,liveLeaseActive}=mod.exports;
test('Live snapshots only contain bounded mock state, never arbitrary screen data',()=>{
 assert.equal(sanitizeMockSnapshot({stage:'completed'}),null);
 const s=sanitizeMockSnapshot({stage:'reading',rPassage:999,w1:'x'.repeat(30000),lAnswers:{1:'x'.repeat(250),41:'hidden'},password:'secret',html:'<script>'});
 assert.equal(s.rPassage,3);assert.equal(s.w1.length,25000);assert.equal(s.lAnswers['1'].length,200);assert.equal(s.lAnswers['41'],undefined);assert.equal(s.password,undefined);assert.equal(s.html,undefined);
});
test('Viewing and online leases expire rather than showing an offline screen as live',()=>{
 const now=Date.now();assert.equal(liveLeaseActive(new Date(now-14000).toISOString(),now),true);assert.equal(liveLeaseActive(new Date(now-15000).toISOString(),now),false);assert.equal(liveLeaseActive('invalid',now),false);assert.equal(liveLeaseActive(new Date(now+1000).toISOString(),now),false);
});
