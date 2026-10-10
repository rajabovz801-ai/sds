import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const code=ts.transpileModule(fs.readFileSync('app/api/challenge-mock/route.ts','utf8')+'\nexport {retryFailedAssessments};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({allowed=false,stage='listening',preview=false,open=true,stopped=false,stopDuringHeartbeat=false}={}){
 const calls=[];let live={allowed,heartbeat_at:stopped?'1970-01-01T00:00:00.000Z':new Date().toISOString(),viewed_at:new Date().toISOString(),snapshot:{stage:'reading'},snapshot_at:new Date().toISOString()};
 const row={id:'attempt',stage,student_id:'student',day_number:4};
 const db={from(table){let patch=null,upsert=false,queue=false;const filters={};
  const run=async()=>{
   calls.push({table,patch,filters:{...filters}});
   if(table==='ark60_content')return {data:{payload:{}},error:null};
   if(table==='ark60_reading_passages')return {data:[1,2,3].map(ordinal=>({ordinal,questions:[]})),error:null};
   if(table==='ark60_mock_attempts')return {data:queue?[]:row,error:null};
   if(table==='ark60_mock_live'){
    if(patch){
     if(stopDuringHeartbeat&&patch.heartbeat_at&&!('viewed_at' in patch))live={...live,heartbeat_at:'1970-01-01T00:00:00.000Z',snapshot:null};
     const matches=upsert||Object.entries(filters).every(([k,v])=>k==='student_id'||k==='day_number'||live[k]===v);
     if(matches)live={...live,...patch};
     return {data:matches?{...live}:null,error:null};
    }
    return {data:{...live},error:null};
   }
   throw Error(table);
  };
  const b={select(){return b},eq(k,v){filters[k]=v;return b},in(){return b},not(){queue=true;return b},limit(){return b},order(){return b},update(v){patch=v;return b},upsert(v){patch=v;upsert=true;return b},maybeSingle:run,single:run,then(resolve,reject){return run().then(resolve,reject)}};return b;
 }};
 const mod={exports:{}};
 new Function('require','exports','module',code)(name=>{
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init.status})}};
  if(name==='@/lib/mock-live')return {liveLeaseActive:()=>true,sanitizeMockSnapshot:v=>v};
  if(name==='@/lib/ark60-content-auth')return {getStudent:async()=>({id:'student'}),isOwnOrigin:()=>true,isDayOpen:async()=>open,isPreview:()=>preview};
  if(name==='@/lib/supabase/server')return {getServiceSupabase:()=>db};
  throw Error(name);
 },mod.exports,mod);
 return {...mod.exports,calls,live:()=>live};
}
const req=(action,extra={})=>({url:'https://example.test/api/challenge-mock?day=4',json:async()=>({action,day:4,...extra})});

test('Start and Start Listening require consent on the server, including teacher preview',async()=>{
 for(const preview of [false,true])for(const action of ['start','start_listening']){
  const api=setup({preview});assert.equal((await api.POST(req(action))).status,403);
  assert.ok(api.calls.every(c=>c.table!=='ark60_mock_attempts'));
 }
 const api=setup({allowed:true});assert.equal((await api.POST(req('start'))).status,200);
});
test('Exit clears snapshots and viewer access without forgetting consent, even after day closes',async()=>{
 const api=setup({allowed:true,open:false});assert.equal((await api.POST(req('live_stop'))).status,200);
 assert.equal(api.live().allowed,true);assert.equal(api.live().snapshot,null);assert.equal(api.live().viewed_at,null);assert.equal(Date.parse(api.live().heartbeat_at),0);
 assert.ok(api.calls.every(c=>c.table==='ark60_mock_live'));
});
test('A stopped mock cannot be revived by a heartbeat, including an in-flight heartbeat race',async()=>{
 for(const options of [{stopped:true},{stopDuringHeartbeat:true}]){
  const api=setup({allowed:true,...options});await api.POST(req('live_heartbeat',{snapshot:{stage:'writing'}}));
  assert.equal(Date.parse(api.live().heartbeat_at),0);
  if(options.stopped)assert.ok(api.calls.every(c=>!c.patch));
  else assert.equal(api.live().snapshot,null);
 }
});
test('Returning to an active mock resumes existing consent but finished mocks cannot resume',async()=>{
 const api=setup({allowed:true,stopped:true});assert.equal((await api.POST(req('live_resume'))).status,200);assert.notEqual(Date.parse(api.live().heartbeat_at),0);
 for(const stage of ['completed','assessing']){
  const finished=setup({allowed:true,stage});assert.equal((await finished.POST(req('live_resume'))).status,409);assert.ok(finished.calls.every(c=>!c.patch));
 }
});
test('Student reload receives saved consent for the same mock',async()=>{
 const api=setup({allowed:true});const result=await api.GET(req('state'));
 assert.equal(result.status,200);assert.equal(result.body.live_consent,true);
});
test('Student retry checks target their own result while admin retries can process the day queue',async()=>{
 const student=setup();await student.retryFailedAssessments({},4,1,'student');
 assert.equal(student.calls[0].filters.student_id,'student');
 const admin=setup();await admin.retryFailedAssessments({},4,2);
 assert.equal(admin.calls[0].filters.student_id,undefined);
});
