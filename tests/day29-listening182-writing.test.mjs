import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const listening=JSON.parse(fs.readFileSync('docs/content/day29-listening.json','utf8'));
const writing=JSON.parse(fs.readFileSync('docs/content/day29-writing.json','utf8'));
test('Day 29 has exactly 40 unique questions and every matching answer is selectable',()=>{
 const numbers=[];
 for(const sec of listening.sections)for(const b of sec.blocks){
  if(b.kind==='notes_groups')for(const g of b.groups)for(const line of g.items)for(const token of line)if(typeof token==='object')numbers.push(token.q);
  if(b.kind==='mcq')for(const q of b.questions){numbers.push(q.q);assert.ok(q.options[listening.answer_key[q.q][0]]);}
  if(b.kind==='matching')for(const q of b.items){numbers.push(q.q);for(const answer of listening.answer_key[q.q])assert.ok(b.choices[answer]);}
  if(b.kind==='choose_two'){numbers.push(...b.questions);assert.ok(b.question);}
 }
 assert.deepEqual(numbers,Array.from({length:40},(_,i)=>i+1));
 assert.equal(Object.keys(listening.answer_key).length,40);
 assert.equal(Object.keys(listening.sections[2].blocks[0].choices).join(''),'ABCDEFGH');
});
test('production Listening grader awards 40/40, accepts swapped pairs, rejects duplicated pair marks',()=>{
 const source=fs.readFileSync('app/api/challenge-listening/route.ts','utf8');
 const helpers=source.slice(source.indexOf('function norm('),source.indexOf('async function getContent('));
 const grader=source.slice(source.indexOf('function grade('),source.indexOf('async function getLatestAttempt('));
 const context={};vm.createContext(context);vm.runInContext(stripTypeScriptTypes(helpers+'\n'+grader+'\nglobalThis.grader=grade;'),context);
 const answers=Object.fromEntries(Object.entries(listening.answer_key).map(([q,a])=>[q,a[0]]));
 Object.assign(answers,{'27':'D','28':'B','29':'E','30':'B'});
 assert.equal(context.grader(listening,answers).score,40);
 assert.equal(context.grader(listening,answers).band,9);
 answers['28']='D';assert.equal(context.grader(listening,answers).score,39);
});
test('Writing keeps the original chart and standard 20-minute Task 1 settings',()=>{
 assert.equal(writing.task_type,'task1');assert.equal(writing.duration_seconds,1200);assert.equal(writing.min_words,150);
 assert.equal(writing.visual_kind,'/writing/day29-consumer-goods-2010.png');
 assert.ok(fs.statSync('public'+writing.visual_kind).size>10000);
});
