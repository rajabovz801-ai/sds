import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function render(submission){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync('app/day/[day]/writing/WritingResult.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(require,m,m.exports);return renderToStaticMarkup(React.createElement(m.exports.default,{submission}));}
test('AI result appears while teacher review is pending',()=>{const html=render({review_status:'pending',payload:{ai_assessment:{band:6,task_criterion:6,coherence_cohesion:6,lexical_resource:6,grammar:6,summary:'Aniq izoh',improvement_plan:['Misol qo‘shing'],errors:[{original:'He go',correction:'He goes',explanation:'Moslik'}]}}});assert.match(html,/6.0/);assert.match(html,/Aniq izoh/);assert.match(html,/He goes/);assert.match(html,/Misol qo‘shing/);assert.match(html,/official IELTS/)});
test('pending and failed assessments never invent a zero band',()=>{for(const ai_status of ['pending','error']){const html=render({review_status:'pending',payload:{ai_status}});assert.doesNotMatch(html,/0.0/);assert.match(html,/saqlangan/);}});
test('teacher final score is distinct from estimated AI score',()=>{const html=render({review_status:'reviewed',band:7,review_feedback:'Teacher checked',payload:{ai_assessment:{band:6}}});assert.match(html,/7.0/);assert.match(html,/Teacher checked/);assert.match(html,/6.0/)});
