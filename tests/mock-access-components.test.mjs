import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
function load(path,react=React){const m={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==='react'?react:name==='react/jsx-runtime'?jsx:{default:({children,href})=>React.createElement('a',{href},children)},m.exports,m);return m.exports.default;}
test('Scheduled gate shows the exact time without an early code form or exam content',()=>{
 const Gate=load('app/components/mock-access-gate.tsx');
 const html=renderToStaticMarkup(React.createElement(Gate,{day:18,scheduled:true,opensAt:'2026-10-18T09:00:00+05:00'}));
 assert.match(html,/09:00/);assert.doesNotMatch(html,/<form|passage_text|answer_key/);
 const open=renderToStaticMarkup(React.createElement(Gate,{day:18,scheduled:false,opensAt:null}));
 assert.match(open,/mock-personal-code/);assert.match(open,/To‘lov ma’lumotlari/);assert.match(open,/rustam_usmon0v/);
});
test('Admin shows new code with its intended recipient and the payment confirmation control',()=>{
 let position=0;const states=new Map([[0,[{id:'qa',first_name:'QA',last_name:'Student',username:'qa'}]],[2,'qa'],[7,{code:'ABCD-EF12-3456',name:'QA Student (@qa)'}]]);
 const fake={...React,useState(value){const n=position++;return [states.has(n)?states.get(n):value,()=>{}]}};
 const Panel=load('app/admin/mock/mock-code-panel.tsx',fake);
 const html=renderToStaticMarkup(React.createElement(Panel,{day:18}));
 assert.match(html,/QA Student \(@qa\)/);assert.match(html,/ABCD-EF12-3456/);assert.match(html,/To‘lovini tekshirdim va tasdiqlayman/);assert.match(html,/Kod yaratish/);
});
