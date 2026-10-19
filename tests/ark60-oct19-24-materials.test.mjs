import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const route=read('app/api/challenge-reading/route.ts');
const normSource=route.match(/function normalize\(s:unknown\)\{([\s\S]*?)\}\n/)[1];
const normalize=new Function('s',normSource);
let grading=route.slice(route.lastIndexOf('let score=0;const usedPairAnswers'),route.indexOf(' const seconds=timerState(start).elapsed_seconds;'));
grading=grading.replace('new Map<string,Set<string>>()','new Map()').replace('(v:unknown)','(v)').replaceAll('new Set<string>()','new Set()');
const grade=new Function('questions','key','answers','normalize',grading+'return score;');
const rows=JSON.parse(read('docs/oct19-24/reading.json'));
for(const r of rows)test(`${r.day_number}/${r.ordinal}: ${r.title} grades all answers and evidence`,()=>{
 assert.equal(r.questions.length,r.answer_key.length);assert.equal(r.analysis.length,r.questions.length);
 const answers={};const used=new Map();
 for(let i=0;i<r.questions.length;i++){
  const q=r.questions[i],keys=r.answer_key[i];let answer=keys[0];
  if(q.pair_group){const prior=used.get(q.pair_group);answer=keys.find(x=>x!==prior);used.set(q.pair_group,answer)}
  answers[q.number]=answer;
  assert.ok(r.passage_text.includes(r.analysis[i].quote));
  if(q.type==='gap')assert.ok(keys.some(k=>r.passage_text.toLowerCase().includes(k.toLowerCase())));
  if(q.options&&q.type!=='tfng')for(const k of keys)assert.ok(q.options.some(o=>o.match(/^([ivx]+|[A-Z])(?:[.): ]|$)/i)?.[1]===k));
 }
 assert.equal(grade(r.questions,r.answer_key,answers,normalize),r.questions.length);
 assert.equal(grade(r.questions,r.answer_key,{},normalize),0);
 for(const group of used.keys()){
  const qs=r.questions.filter(q=>q.pair_group===group);const swapped={...answers,[qs[0].number]:answers[qs[1].number],[qs[1].number]:answers[qs[0].number]};
  assert.equal(grade(r.questions,r.answer_key,swapped,normalize),r.questions.length);
  const duplicate={...answers,[qs[1].number]:answers[qs[0].number]};
  assert.equal(grade(r.questions,r.answer_key,duplicate,normalize),r.questions.length-1);
 }
});
test('vocabulary quizzes have 20 distinct translations and original passage examples',()=>{
 const v=JSON.parse(read('docs/oct19-24/vocabulary.json'));assert.equal(v.units.length,12);assert.equal(v.terms.length,240);
 assert.equal(new Set(v.terms.map(t=>t.family_key)).size,240);
 for(const u of v.units){const ts=v.terms.filter(t=>t.unit_id===u.id);assert.equal(ts.length,20);assert.equal(new Set(ts.map(t=>t.meaning_uz.toLowerCase())).size,20);const r=rows.find(r=>r.day_number===u.day_number&&r.ordinal===u.source_ordinal);assert.equal(r.title,u.source_title);for(const t of ts){assert.ok(r.passage_text.includes(t.example));assert.ok(t.example.toLowerCase().replace(/[\s-]+/g,' ').includes(t.display_word.toLowerCase().replace(/[\s-]+/g,' ')))}}
});
test('Vocabulary follows all six new passage days and opens complete published units',async()=>{
 
 const {vocabularySourceLabel,vocabularyUnitsReady}=await import('../lib/ark60-reading-plan.ts');
 for(const [day,p] of [[19,1],[20,2],[21,3],[22,1],[23,2],[24,3]])assert.equal(vocabularySourceLabel({day_number:day,source_kind:'reading',source_ordinal:2}),`Reading · Passage ${p} · Practice 2`);
 assert.equal(vocabularyUnitsReady([]),false);assert.equal(vocabularyUnitsReady([{word_count:19}]),false);
 assert.equal(vocabularyUnitsReady([{word_count:20},{word_count:20}]),true);
 assert.equal(vocabularyUnitsReady([{word_count:20},{word_count:19}]),false);
 assert.equal(vocabularyUnitsReady(Array.from({length:6},()=>({word_count:20}))),true);
});
