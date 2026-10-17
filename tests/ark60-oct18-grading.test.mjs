import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const api=fs.readFileSync('app/api/challenge-mock/route.ts','utf8');
const code=ts.transpileModule(api.slice(api.indexOf('function norm('),api.indexOf('const WRITING_SCHEMA=')),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const f=new Function('getServiceSupabase',code+';return {gradeReading,answerReview};')(()=>{});
const reading=[{questions:[38,39,40].map(number=>({number,text:'Choose three',answer_group:'38-40'})),answer_key:[['B','D','E'],['B','D','E'],['B','D','E']]}];
test('Reading choose-three accepts all permutations and rejects duplicate credit in score and review',()=>{
 for(const values of [['B','D','E'],['E','B','D'],['D','E','B']]){
  const a=Object.fromEntries(values.map((v,i)=>[38+i,v]));
  assert.equal(f.gradeReading(reading,a).score,3);
 }
 const answers={38:'B',39:'B',40:'E'};
 assert.equal(f.gradeReading(reading,answers).score,2);
 const review=f.answerReview({listening:{payload:{answer_key:{}}},reading},{},answers);
 assert.deepEqual(review.reading.map(x=>x.status),['correct','wrong','correct']);
});
test('Empty, invalid and ordinary non-group Reading answers keep their grading behavior',()=>{
 assert.equal(f.gradeReading(reading,{38:'A',39:'',40:'D'}).score,1);
 const ordinary=[{questions:[{number:1},{number:2}],answer_key:[['TRUE'],['100','one hundred']]}];
 assert.equal(f.gradeReading(ordinary,{1:'true',2:'one hundred'}).score,2);
});
