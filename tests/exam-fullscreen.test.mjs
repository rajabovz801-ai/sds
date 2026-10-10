import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('lib/exam-fullscreen.ts','utf8');
const mod={exports:{}};new Function('exports','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const {ensureExamFullscreen}=mod.exports;
test('Fullscreen starts synchronously from activation and is not requested again when active',async()=>{
 let calls=0;const doc={fullscreenEnabled:true,fullscreenElement:null,documentElement:{requestFullscreen:async()=>{calls++;doc.fullscreenElement={}}}};
 const pending=ensureExamFullscreen(doc);assert.equal(calls,1);assert.equal(await pending,true);
 assert.equal(await ensureExamFullscreen(doc),true);assert.equal(calls,1);
});
test('Unsupported or denied fullscreen returns safely without breaking exam actions',async()=>{
 assert.equal(await ensureExamFullscreen({fullscreenEnabled:false}),false);
 assert.equal(await ensureExamFullscreen({fullscreenEnabled:true,documentElement:{requestFullscreen:async()=>{throw Error('Denied')}}}),false);
});
