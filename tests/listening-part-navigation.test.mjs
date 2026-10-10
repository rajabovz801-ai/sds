import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const input=fs.readFileSync('app/components/listening-part-navigation.tsx','utf8').replace('import "./exam-part-navigation.css";','');
const code=ts.transpileModule(input,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('require','exports','module',code)(createRequire(import.meta.url),mod.exports,mod);
const Navigation=mod.exports.default;
test('Each Listening part displays only its ten questions and keeps answer/current markers',()=>{
 for(let part=1;part<=4;part++){
  const current=(part-1)*10+3;
  const html=renderToStaticMarkup(React.createElement(Navigation,{part,currentQuestion:current,questionClass:q=>q===current?'answered':'',onPart:()=>{},onQuestion:()=>{}}));
  const numbers=[...html.matchAll(/aria-label="Question (\d+)"/g)].map(m=>Number(m[1]));
  assert.deepEqual(numbers,Array.from({length:10},(_,i)=>(part-1)*10+i+1));
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.match(html,/aria-current="step" class="current answered"/);
 }
});
test('Part and question controls call only their supplied navigation handlers',()=>{
 const actions=[];const element=Navigation({part:2,currentQuestion:11,questionClass:()=>'',onPart:n=>actions.push(['part',n]),onQuestion:n=>actions.push(['question',n])});
 const parts=element.props.children;
 parts[3].props.children[0].props.onClick();parts[1].props.children[1].props.children[4].props.onClick();
 assert.deepEqual(actions,[['part',4],['question',15]]);
});

test('Selected question group follows its Part tab, including Reading ranges',()=>{
 const html=renderToStaticMarkup(React.createElement(Navigation,{part:2,currentQuestion:14,parts:[1,2,3],questions:[14,15,16],label:'Reading parts',questionClass:()=>'',onPart:()=>{},onQuestion:()=>{}}));
 assert.ok(html.indexOf('Part 2</button>')<html.indexOf('Question 14'));
 assert.ok(html.indexOf('Question 16')<html.indexOf('Part 3</button>'));
 assert.doesNotMatch(html,/Part 4/);
});
