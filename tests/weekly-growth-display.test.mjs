import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function render(data,pro=true){
 let calls=0;
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('app/components/weekly-growth.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const local=id=>id==='react'?{...React,useState:initial=>[calls++===0?data:initial,()=>{}]}:id==='./profile-photo'?{ProBadge:({active})=>active?React.createElement('span',{className:'pro-badge'},'PRO'):null}:require(id);
 new Function('require','module','exports',code)(local,module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.default,{pro,onOpenPlan:()=>{}}));
}
const empty={days:Array.from({length:7},(_,i)=>({date:'2026-10-'+(14+i),reading:null,listening:null})),change:{reading:null,listening:null}};
test('no-result dashboard uses a compact card instead of empty metric panels',()=>{const html=render(empty);assert.match(html,/weekly-growth-compact/);assert.match(html,/Today’s tasks/);assert.doesNotMatch(html,/weekly-metrics|weekly-chart-wrap/)});
test('real results retain the accessible SVG chart and day controls',()=>{const data=structuredClone(empty);data.days[6].reading=70;const html=render(data);assert.match(html,/weekly-chart/);assert.match(html,/70%/);assert.match(html,/aria-pressed="true"/)});
test('free account sees subscription link without results',()=>{const html=render(empty,false);assert.match(html,/Get PRO/);assert.doesNotMatch(html,/weekly-chart-wrap/)});
