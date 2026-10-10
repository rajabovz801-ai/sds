import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source=fs.readFileSync('app/api/challenge-mock/route.ts','utf8');
const code=ts.transpileModule(source+'\nexport {canRetryAssessment};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({stage='writing',saveError=false,loseClaim=false,fetchFails=false}={}){
 const events=[];
 let row={id:'attempt',student_id:'student',day_number:4,stage,writing_started_at:new Date().toISOString()};
 const db={from(table){let patch=null;const filters={};
  const run=async()=>{
   if(table==='ark60_content')return {data:{payload:{tasks:[{prompt:'Compare students',visual:{kind:'table',headers:['Subject','2015'],rows:[['IT','620']]},instructions:['Report the main features']},{prompt:'Car use',instructions:['Give reasons']}] }},error:null};
   if(table==='ark60_reading_passages')return {data:[1,2,3].map(ordinal=>({id:String(ordinal),ordinal,questions:[],answer_key:{}})),error:null};
   if(table==='ark60_mock_attempts'){
    if(patch){events.push({type:'save',patch});
     if(saveError)return {data:null,error:Error('save failed')};
     if(loseClaim||filters.stage&&filters.stage!==row.stage)return {data:null,error:null};
     row={...row,...patch};
    }
    return {data:{...row},error:null};
   }
   return {data:{id:'existing'},error:null};
  };
  const b={select(){return b},eq(k,v){filters[k]=v;return b},in(){return b},order(){return b},limit(){return b},update(v){patch=v;return b},upsert(){return b},maybeSingle:run,single:run,then(resolve,reject){return run().then(resolve,reject)}};return b;
 }};
 const mod={exports:{}};
 new Function('require','exports','module','fetch','process',code)(name=>{
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init.status})}};
  if(name==='@/lib/mock-live')return {};
  if(name==='@/lib/ark60-content-auth')return {getStudent:async()=>({id:'student'}),isOwnOrigin:()=>true,isDayOpen:async()=>true,isPreview:()=>false};
  if(name==='@/lib/supabase/server')return {getServiceSupabase:()=>db};
  throw Error(name);
 },mod.exports,mod,async(url,options)=>{
  events.push({type:'ai',row:{...row},body:JSON.parse(options.body)});
  if(fetchFails)throw Error('connection reset');
  const task={band:7,task_achievement:7,task_response:7,coherence_cohesion:7,lexical_resource:7,grammar:7,feedback:'Feedback'};
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({task1:task,task2:task,summary:'Summary'})}]}]})};
 },{env:{OPENAI_API_KEY:'test'}});
 return {...mod.exports,events,row:()=>row};
}
const request={json:async()=>({action:'submit_writing',day:4,task1:'Latest task one',task2:'Latest task two'})};

test('Both final essays are durably saved before AI runs, then results complete',async()=>{
 const api=setup();const response=await api.POST(request);
 assert.equal(response.status,200);assert.equal(response.body.stage,'completed');
 const ai=api.events.find(e=>e.type==='ai');
 assert.equal(api.events[0].type,'save');assert.equal(ai.row.stage,'assessing');
 assert.equal(ai.row.writing_task1,'Latest task one');assert.equal(ai.row.writing_task2,'Latest task two');
 assert.ok(ai.row.writing_submitted_at);assert.equal(api.row().writing_band,7);
 assert.match(ai.body.input,/TASK 1 REFERENCE DATA:/);
 assert.match(ai.body.input,/620/);assert.match(ai.body.input,/Report the main features/);
});
test('An interrupted AI call preserves essays and leaves a retryable assessment',async()=>{
 const api=setup({fetchFails:true});const response=await api.POST(request);
 assert.equal(response.status,202);assert.equal(api.row().stage,'assessing');
 assert.equal(api.row().writing_task1,'Latest task one');assert.equal(api.row().writing_task2,'Latest task two');
 assert.equal(api.canRetryAssessment(api.row()),true);
});
test('A failed database save never starts AI',async()=>{
 const api=setup({saveError:true});assert.equal((await api.POST(request)).status,500);
 assert.equal(api.events.some(e=>e.type==='ai'),false);
});
test('A duplicate submission or lost atomic claim never runs AI or replaces essays',async()=>{
 for(const options of [{stage:'assessing'},{loseClaim:true}]){
  const api=setup(options);assert.equal((await api.POST(request)).status,202);
  assert.equal(api.events.some(e=>e.type==='ai'),false);
 }
});
test('Repeating Submit after completion returns the saved result without another AI call',async()=>{
 const api=setup({stage:'completed'});const result=await api.POST(request);
 assert.equal(result.status,200);assert.equal(result.body.stage,'completed');
 assert.equal(api.events.some(e=>e.type==='ai'),false);
});
test('An abandoned assessment becomes retryable; a live assessment stays locked',()=>{
 const api=setup();
 assert.equal(api.canRetryAssessment({grading_error:'retrying',updated_at:new Date().toISOString()}),false);
 assert.equal(api.canRetryAssessment({grading_error:'retrying',updated_at:new Date(Date.now()-121000).toISOString()}),true);
 assert.equal(api.canRetryAssessment({grading_error:'retry:3:failed'}),false);
});
