import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const workspace=await import('../lib/challenge-workspace.ts');
const source=ts.transpileModule(fs.readFileSync('app/components/challenge-hub-panels.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function render(ranks,studentId='viewer'){
 const rows=ranks.map((rank,i)=>({student_id:'student-'+i,full_name:'Student '+i,username:'student'+i,coins:rank===1?18:rank===2?10:8,active_seconds:600-i,status:'offline',rank}));let state=0;const module={exports:{}};
 const local=id=>id==='../../lib/challenge-workspace'?workspace:id==='react'?{...React,useState:initial=>[state++===0?rows:state===3?false:initial,()=>{}]}:id==='./workspace-art'?{WorkspaceArt:()=>null,RankMedal:({rank})=>React.createElement('span',{'data-medal':rank},rank)}:id==='./reward-style'?{RewardAvatar:()=>null}:id==='./profile-photo'?{ProBadge:()=>null}:id==='./loading-indicator'?{default:()=>null}:require(id);
 new Function('require','module','exports',source)(local,module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.LeaderboardPanel,{studentId}));
}
for(const ranks of [[1,1,2],[1,2,2],[1,1,1],[1],[1,1]])test('podium slots remain unique for ranks '+ranks.join(','),()=>{
 const html=render(ranks),areas=[...html.matchAll(/style="grid-area:([^;"]+)/g)].map(x=>x[1]);
 assert.equal(areas.length,ranks.length,'every podium card must explicitly select a slot independent of rank');
 assert.equal(new Set(areas).size,ranks.length,'tied ranks must never share a grid area');
 assert.deepEqual([...html.matchAll(/data-medal="(\d+)"/g)].map(x=>Number(x[1])),ranks,'medals must retain actual tied ranks');
});

test('only the first ten students are listed, followed by the viewer outside that list',()=>{
 const html=render(Array.from({length:15},(_,i)=>i+1),'student-12');
 assert.equal((html.match(/class="lb-table-row /g)||[]).length,7);
 assert.match(html,/class="lb-current-row/);
 assert.match(html,/@student12/);
 assert.doesNotMatch(html,/@student10</);
});
test('viewer in top ten is highlighted without a duplicate own-rank card',()=>{
 const html=render(Array.from({length:15},(_,i)=>i+1),'student-8');
 assert.doesNotMatch(html,/class="lb-current-row/);
 assert.match(html,/lb-table-row me/);
});
