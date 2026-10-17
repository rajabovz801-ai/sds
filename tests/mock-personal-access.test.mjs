import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const path='lib/mock-access-policy.ts';
const module={exports:{}};
if(fs.existsSync(path))new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module.exports);
const {decideMockEntry,personalMockOpensAt}=module.exports;
const input={day:18,studentId:'alice',preview:false,now:Date.parse('2026-10-18T09:00:00+05:00'),grant:{day_number:18,student_id:'alice',redeemed_at:'2026-10-17T20:00:00+05:00',revoked_at:null}};
test('Day 18 opens at exactly 09:00 Tashkent; preview bypasses the schedule',()=>{
 assert.equal(typeof decideMockEntry,'function');
 assert.equal(personalMockOpensAt(18),'2026-10-18T09:00:00+05:00');
 assert.equal(decideMockEntry({...input,now:input.now-1}),'scheduled');
 assert.equal(decideMockEntry(input),'allowed');
 assert.equal(decideMockEntry({...input,preview:true,now:input.now-1,grant:null}),'preview');
});
test('Only an account-bound, redeemed, current-day, unrevoked code grants entry',()=>{
 assert.equal(typeof decideMockEntry,'function');
 for(const grant of [null,{...input.grant,student_id:'bob'},{...input.grant,day_number:11},{...input.grant,redeemed_at:null},{...input.grant,revoked_at:'2026-10-18T04:01:00Z'}])assert.equal(decideMockEntry({...input,grant}),'code_required');
 assert.equal(decideMockEntry({...input,now:NaN}),'scheduled');
});
test('Historical mocks retain their existing access path',()=>{
 assert.equal(typeof decideMockEntry,'function');
 assert.equal(decideMockEntry({...input,day:11,grant:null}),'legacy');
});
