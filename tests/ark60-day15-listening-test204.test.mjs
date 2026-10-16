import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const sql=fs.readFileSync('supabase/migrations/20261016_day15_listening_test204.sql','utf8');
const payload=JSON.parse(sql.slice(sql.indexOf('$json$')+6,sql.lastIndexOf('$json$')));
test('TEST 204 provides exactly 40 unique rendered questions with valid answer choices',()=>{
 const numbers=[];
 function visit(v){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object'){if(typeof v.q==='number')numbers.push(v.q);Object.values(v).forEach(visit)}}
 visit(payload.sections);
 assert.deepEqual(numbers.sort((a,b)=>a-b),Array.from({length:40},(_,i)=>i+1));
 assert.equal(payload.sections.length,4);
 for(const section of payload.sections)for(const block of section.blocks){
  if(block.kind==='mcq')for(const q of block.questions)assert.ok(Object.hasOwn(q.options,payload.answer_key[q.q][0]));
  if(block.kind==='matching')for(const q of block.items)assert.ok(Object.hasOwn(block.choices,payload.answer_key[q.q][0]));
  if(block.image_url)assert.ok(fs.existsSync('public'+block.image_url));
 }
 assert.equal(payload.audio_url,'https://ia601600.us.archive.org/6/items/test-204-ready/TEST_204_ready.mp3');
});
test('TEST 204 grades all 40 answers using the real Listening grader and corrects Q16 to school office',()=>{
 const source=fs.readFileSync('app/api/challenge-listening/route.ts','utf8');
 const functions=source.slice(source.indexOf('function norm('),source.indexOf('async function getContent'))+source.slice(source.indexOf('function grade('),source.indexOf('async function getLatestAttempt'));
 const code=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const grade=new Function(code+'; return grade;')();
 const answers=Object.fromEntries(Object.entries(payload.answer_key).map(([q,a])=>[q,a[0]]));
 assert.equal(payload.answer_key['16'][0],'B');
 const perfect=grade(payload,answers);assert.equal(perfect.score,40);assert.equal(perfect.band,9);assert.deepEqual(perfect.part_scores,[10,10,10,10]);
 answers['16']='C';assert.equal(grade(payload,answers).score,39);
 answers['16']='B';answers['3']='25th February';answers['5']='3 days';assert.equal(grade(payload,answers).score,40);
 assert.equal(grade(payload,{}).score,0);
});
