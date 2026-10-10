import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
const mod={exports:{}};
new Function('require','exports','module',ts.transpileModule(fs.readFileSync('app/admin/mock/mock-live-view.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='react'?React:name==='react/jsx-runtime'?jsxRuntime:null,mod.exports,mod);

const View=mod.exports.MockLiveContent;
const render=(stage,content,extra={})=>renderToStaticMarkup(React.createElement(View,{data:{updated_at:new Date().toISOString(),snapshot:{stage,lSection:2,lAnswers:{15:'B'},rPassage:1,rAnswers:{1:'TRUE'},wTask:1,w1:'<script>typed answer</script>',...extra},content}}));
test('Admin Listening replica follows selected part and shows map and saved choices',()=>{
 const html=render('listening',{listening:{sections:[{number:1,blocks:[{title:'Hidden part'}]},{number:2,blocks:[{kind:'matching',range:'15–20',title:'Map',image_url:'/map.png',hide_choices:true,items:[{q:15,text:'Library'}]}]}]}});
 assert.ok(html.includes('/map.png'));assert.ok(html.includes('Library'));assert.ok(html.includes('value="B"'));assert.ok(!html.includes('Hidden part'));
});
test('Admin Reading replica uses active passage and current answers',()=>{
 const html=render('reading',{reading:[{ordinal:1,title:'Active passage',text:'Passage text',questions:[{number:1,text:'Visible question',options:['TRUE','FALSE']}]},{ordinal:2,title:'Hidden passage'}]});
 assert.ok(html.includes('Active passage'));assert.ok(html.includes('Visible question'));assert.ok(html.includes('value="TRUE"'));assert.ok(!html.includes('Hidden passage'));
});
test('Admin Writing replica renders task prompt and safely escaped live typing',()=>{
 const html=render('writing',{writing:{tasks:[{label:'Writing Task 1',prompt:'Describe this table',instructions:['150 words']}]} });
 assert.ok(html.includes('Describe this table'));assert.ok(html.includes('&lt;script&gt;typed answer&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
});
