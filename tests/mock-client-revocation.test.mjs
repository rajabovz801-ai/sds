import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod={exports:{}};
const path='lib/mock-client-access.ts';
if(fs.existsSync(path))new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports);
test('Any rejected mock request surfaces revocation and stops active runtime',async()=>{
 assert.equal(typeof mod.exports.fetchMockWithAccess,'function');
 for(const stage of ['reading','writing','assessing','listening']){
  let gate=null;
  const result=await mod.exports.fetchMockWithAccess(async()=>new Response(JSON.stringify({code_required:true}),{status:403}),'/api/challenge-mock',{},g=>{gate=g});
  assert.equal(result.status,403);assert.equal(gate.scheduled,false);assert.equal(mod.exports.mockRuntimeActive(stage,gate),false);
 }
});
test('Re-entry restores same-stage unsaved answers while keeping the server timer',()=>{
 const r=mod.exports.restoreMockDraft({stage:'reading',reading_remaining:70,reading_answers:{1:'saved'}},{stage:'reading',rAnswers:{1:'unsaved'},rRemaining:100});
 assert.equal(r.reading_answers[1],'unsaved');assert.equal(r.reading_remaining,70);
 const w=mod.exports.restoreMockDraft({stage:'writing',writing_task1:'saved',writing_remaining:50},{stage:'writing',w1:'unsaved essay',w2:'second essay'});
 assert.equal(w.writing_task1,'unsaved essay');assert.equal(w.writing_remaining,50);
 assert.deepEqual(mod.exports.restoreMockDraft({stage:'completed'},{stage:'reading',rAnswers:{1:'old'}}),{stage:'completed'});
});
test('Ordinary request failures do not impersonate access revocation',async()=>{
 assert.equal(typeof mod.exports.fetchMockWithAccess,'function');
 let calls=0;await mod.exports.fetchMockWithAccess(async()=>new Response('{}',{status:500}),'/api/challenge-mock',{},()=>calls++);assert.equal(calls,0);
 assert.equal(mod.exports.mockRuntimeActive('reading',null),true);
 assert.equal(mod.exports.mockRuntimeActive('completed',null),false);
});
