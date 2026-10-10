import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';

function load(path,resolve){const mod={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(resolve,mod.exports,mod);return mod.exports;}
const questions=load('app/components/reading-question-ui.tsx',()=>jsx);
function render({stage='not_started',consent=false,confirmation=null}={}){
 let index=0;
 const data={preview:true,content:{listening:{payload:{sections:[]}},reading:[{id:'passage',ordinal:1,title:'Passage',text:'Passage text',questions:[{number:1,type:'select',text:'A _____ B.',options:['A. First','B. Second']}]}],writing:{payload:{tasks:[{prompt:'Task one'},{prompt:'Task two'}]}}}};
 const states=new Map([[0,data],[1,stage],[2,false],[5,consent],[10,confirmation]]);
 const react={...React,useState(value){const position=index++;return [states.has(position)?states.get(position):typeof value==='function'?value():value,()=>{}]}};
 const Page=load('app/day/[day]/mock/page.tsx',name=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return jsx;
  if(name==='next/navigation')return {useParams:()=>({day:'11'}),useRouter:()=>({push(){}})};
  if(name==='lucide-react')return icons;
  if(name.endsWith('reading-question-ui'))return questions;
  if(name.endsWith('exam-fullscreen'))return {ensureExamFullscreen:async()=>true};
  if(name.endsWith('.css'))return {};
  if(name.endsWith('animated-back-button'))return {default:()=>React.createElement('a',{href:'/dashboard'},'Go back')};
  return {default:()=>null};
 }).default;
 return renderToStaticMarkup(React.createElement(Page));
}
test('Mock entry requires consent before enabling Start and discloses the viewing scope',()=>{
 const denied=render();assert.match(denied,/<button disabled="">Start Full Mock/);assert.match(denied,/Allow mock view/);assert.match(denied,/typed answers during the exam/);
 const allowed=render({consent:true});assert.match(allowed,/<button>Start Full Mock/);assert.match(allowed,/Mock view allowed/);
});
test('Active mock has no viewer notification or Stop sharing overlay, and selects are inline',()=>{
 const html=render({stage:'reading',consent:true});
 assert.doesNotMatch(html,/Admin is viewing|Stop sharing|mock-consent/);
 assert.match(html,/A <select[^>]*cr-inline-select/);assert.match(html,/<\/select> B\./);
});
test('Writing uses an in-page final confirmation with separate cancel and submit actions',()=>{
 const html=render({stage:'writing',consent:true,confirmation:'writing'});
 assert.match(html,/role="dialog"/);assert.match(html,/Submit Writing/);assert.match(html,/Submit and finish/);assert.match(html,/Cancel/);
});
