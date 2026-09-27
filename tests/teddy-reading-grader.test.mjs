import test from "node:test";
import assert from "node:assert/strict";
import {normalizeReadingAnswer,validateReadingConfig,academicReadingBand,gradeReading} from "../lib/teddy-reading-grader.mjs";

const base=()=>{
 const key={};
 for(let q=1;q<=40;q++)key[q]=["A"];
 key[1]=["urban development","urbanisation"];
 key[11]=["B"];key[12]=["D"];
 return {question_count:40,passage_ranges:[
  {label:"Passage 1",start:1,end:13},
  {label:"Passage 2",start:14,end:26},
  {label:"Passage 3",start:27,end:40}
 ],answer_key:key,answer_groups:[{questions:[11,12],answers:["B","D"]}]};
};
const full=()=>{const a={};for(let q=1;q<=40;q++)a[q]="A";a[1]="urban development";a[11]="B";a[12]="D";return a;};

test("normalization handles spaces, Unicode and trailing punctuation but not incorrect plural",()=>{
 assert.equal(normalizeReadingAnswer("  HIGH–TECH. "),"high tech");
 assert.notEqual(normalizeReadingAnswer("cars"),normalizeReadingAnswer("car"));
});
test("complete 40-question Academic Reading returns section scores and band",()=>{
 const s=gradeReading(base(),full());
 assert.deepEqual(s.passages.map(p=>[p.correct,p.total]),[[13,13],[13,13],[14,14]]);
 assert.equal(s.score,40); assert.equal(s.band,9);
});
test("alternative answer and swapped two-letter answers accepted",()=>{
 const a=full(); a[1]="URBANISATION.";a[11]="D";a[12]="B";
 const s=gradeReading(base(),a);
 assert.equal(s.score,40);
});
test("grouped pair accepts both selections in one field",()=>{
 const a=full();a[11]="D, B";a[12]="";
 const s=gradeReading(base(),a);
 assert.equal(s.score,40);
});
test("one matching letter gets one mark; duplicates cannot earn both marks",()=>{
 const a=full();a[11]="B";a[12]="B";
 const s=gradeReading(base(),a);
 assert.equal(s.score,39); assert.equal(s.passages[0].correct,12);
});
test("incorrectly structured passage ranges and missing answer keys fail",()=>{
 const x=base();x.passage_ranges[1].start=13;
 assert.throws(()=>validateReadingConfig(x),/Overlapping/);
 const y=base();delete y.answer_key[30];
 assert.throws(()=>validateReadingConfig(y),/question 30/);
});
test("one passage can be reported without invented IELTS band",()=>{
 const x={question_count:13,passage_ranges:[{label:"Passage 1",start:1,end:13}],answer_key:Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,["B"]]))};
 const a=Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,"B"]));
 const s=gradeReading(x,a);
 assert.equal(s.score,13);assert.equal(s.band,null);assert.equal(s.passages[0].total,13);
});
test("Academic Reading band thresholds",()=>{
 assert.equal(academicReadingBand(33),7.5);
 assert.equal(academicReadingBand(30),7);
 assert.equal(academicReadingBand(0),0);
});
