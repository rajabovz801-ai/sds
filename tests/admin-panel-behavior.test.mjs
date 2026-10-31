import test from 'node:test';
import assert from 'node:assert/strict';
const helpers = await import('../app/admin/admin-utils.ts').catch(()=>({}));
test('Reading grouping retains every passage rather than overwriting passage 2',()=>{
 assert.equal(typeof helpers.groupReading, 'function');
 const rows=[1,2,3].map(ordinal=>({student_id:'a',ordinal,score:ordinal,total:13,elapsed_seconds:60}));
 const groups=helpers.groupReading(rows);
 assert.equal(groups[0].entries.length,3);
 assert.equal(groups[0].entries.reduce((n,r)=>n+r.score,0),6);
});
test('Speaking queue prioritizes playable pending audio nearest expiry',()=>{
 assert.equal(typeof helpers.sortSpeaking, 'function');
 const now=Date.parse('2026-10-27T06:00:00Z');
 const rows=[{id:'late',review_status:'pending',expires_at:'2026-10-30T06:00:00Z'},{id:'expired',review_status:'pending',expires_at:'2026-10-26T06:00:00Z'},{id:'soon',review_status:'pending',expires_at:'2026-10-27T07:00:00Z'},{id:'done',review_status:'reviewed',expires_at:'2026-10-27T06:30:00Z'}];
 assert.deepEqual(helpers.sortSpeaking(rows,now).map(r=>r.id),['soon','late','expired','done']);
 assert.equal(rows[0].id,'late');
});
test('Writing review stages distinguish teacher review, AI queue and assessment errors',()=>{
 assert.equal(typeof helpers.writingStage,'function');
 assert.equal(helpers.writingStage({review_status:'reviewed',payload:{}}),'Published');
 assert.equal(helpers.writingStage({review_status:'pending',payload:{ai_assessment:{band:6}}}),'Teacher review');
 assert.equal(helpers.writingStage({review_status:'pending',payload:{}}),'AI pending');
 assert.equal(helpers.writingStage({review_status:'pending',payload:{ai_status:'error'}}),'AI error');
});
test('Course status respects Tashkent dates and the course boundaries',()=>{
 assert.equal(typeof helpers.courseStatus,'function');
 assert.equal(helpers.courseStatus(new Date('2026-09-30T18:59:00Z')),'Starts 1 October');
 assert.equal(helpers.courseStatus(new Date('2026-10-26T20:00:00Z')),'Challenge · Day 27 / 60');
 assert.equal(helpers.courseStatus(new Date('2026-11-29T19:00:00Z')),'Challenge completed');
});

import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function component(file,states=[],effects=[]){
 let stateIndex=0;
 const fakeReact={...React,useState:initial=>{const index=stateIndex++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return [states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value}]},useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useRef:value=>({current:value})};
 function load(filename){
  const source=fs.readFileSync(filename,'utf8').replace(/<style jsx global>/g,'<style>'),module={exports:{}};
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const localRequire=name=>{
   if(name==='react')return fakeReact;
   if(name==='next/link')return ({children,...props})=>React.createElement('a',props,children);
   if(name==='next/navigation')return {usePathname:()=>'/admin/reading'};
   if(name.endsWith('.css'))return {};
   if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(filename),name);for(const ext of ['','.tsx','.ts'])if(fs.existsSync(base+ext))return load(base+ext);}
   return require(name);
  };
  new Function('require','module','exports',code)(localRequire,module,module.exports);return module.exports;
 }
 return load(path.resolve(file)).default;
}
test('Reading report renders and totals all three passages in the actual page',()=>{
 const rows=[1,2,3].map(ordinal=>({student_id:'student-a',passage_id:'p'+ordinal,day_number:4,ordinal,score:ordinal,total:13,elapsed_seconds:60,submitted_at:'2026-10-04T06:00:00Z',student:{first_name:'Test',last_name:'Student',username:'test'}}));
 const Page=component('app/admin/reading/page.tsx',[4,[{day_number:4,passage_count:3}],rows,rows.map(r=>({id:r.passage_id,ordinal:r.ordinal,title:'Passage '+r.ordinal,day_number:4,status:'published'})),'',false,false,null]);
 const html=renderToStaticMarkup(React.createElement(Page));
 assert.match(html,/<th>Passage 3<\/th>/);
 assert.match(html,/6\/39/);
 assert.match(html,/3m 00s/);
 assert.match(html,/Admin panel/);
});
test('Day navigation prevents going before first or past last available day',()=>{
 const Picker=component('app/admin/day-picker.tsx');
 const days=[{day:1,label:'Day 1'},{day:4,label:'Day 4 · Full Mock'}];
 const first=renderToStaticMarkup(React.createElement(Picker,{days,value:1,onChange:()=>{}}));
 assert.match(first,/aria-label="Previous day" disabled/);
 assert.doesNotMatch(first,/aria-label="Next day" disabled/);
 const last=renderToStaticMarkup(React.createElement(Picker,{days,value:4,onChange:()=>{}}));
 assert.match(last,/aria-label="Next day" disabled/);
 assert.match(last,/Day 4 · Full Mock/);
});
test('Writing empty filters cannot expose an unrelated submission for approval',()=>{
 const Page=component('app/admin/writing/page.tsx',[[{id:'hidden',day_number:1,review_status:'reviewed',payload:{word_count:100},submitted_at:'2026-10-27T06:00:00Z'}],false,'','', 'pending',0,'hidden',{}, {},'',false]);
 const html=renderToStaticMarkup(React.createElement(Page));
 assert.match(html,/Select a Writing submission/);
 assert.doesNotMatch(html,/Approve &amp; publish/);
});

test('Writing notification opens a reviewed submission despite the initial pending filter',async()=>{
 const states=[],effects=[],originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 const rows=[{id:'reviewed',day_number:3,band:7,review_status:'reviewed',review_feedback:'Saved feedback'},{id:'pending',day_number:4,band:null,review_status:'pending'}];
 globalThis.window={location:{search:'?section=writing&id=reviewed'}};
 globalThis.fetch=async()=>({ok:true,json:async()=>({submissions:rows})});
 try{
  const Page=component('app/admin/writing/page.tsx',states,effects);Page();effects[0]();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(states[4],'all');assert.equal(states[5],0);assert.equal(states[6],'reviewed');
  assert.equal(states[7].reviewed,'7');assert.equal(states[8].reviewed,'Saved feedback');
 }finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
test('Speaking notification opens reviewed audio instead of silently reverting to pending',async()=>{
 const states=[],effects=[],originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 const row={id:'reviewed',day_number:3,band:7,review_status:'reviewed',feedback:'Saved',answers:[],expires_at:null};
 globalThis.window={location:{search:'?section=speaking&id=reviewed'}};
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('admin_detail')?{submission:row}:{submissions:[row]}});
 try{
  const Page=component('app/admin/speaking/page.tsx',states,effects);Page();effects[1]();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(states[4],'all');assert.equal(states[5],0);assert.equal(states[6].id,'reviewed');assert.equal(states[1],false);
 }finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow}
});
test('Writing grading locks editable fields until the saved payload is refreshed',()=>{
 const row={id:'w',day_number:1,review_status:'pending',payload:{word_count:100},submitted_at:'2026-10-27T06:00:00Z'};
 const Page=component('app/admin/writing/page.tsx',[[row],false,'','', 'pending',0,'w',{w:'6'},{w:'draft'},'w',false]);
 const html=renderToStaticMarkup(React.createElement(Page));
 assert.match(html,/<select[^>]*disabled/);assert.match(html,/<textarea[^>]*disabled/);
});
test('Speaking grading locks editable fields until the saved payload is refreshed',()=>{
 const row={id:'sp',day_number:1,review_status:'pending',answers:[],content:{payload:{}},student:null,submitted_at:'2026-10-27T06:00:00Z',expires_at:null,audio_expired:false};
 const Page=component('app/admin/speaking/page.tsx',[[row],false,'','', 'pending',0,row,false,{sp:'6'},{sp:'draft'},'sp',false]);
 const html=renderToStaticMarkup(React.createElement(Page));
 assert.match(html,/<select[^>]*disabled/);assert.match(html,/<textarea[^>]*disabled/);
});
