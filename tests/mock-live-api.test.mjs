import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const liveExports={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/mock-live.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(liveExports.exports,liveExports);
const liveModule=liveExports.exports;
const code=ts.transpileModule(fs.readFileSync('app/api/challenge-mock/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({student=null,admin=null,live=null,origin=true}={}){
 const calls=[];
 const db={from(table){const state={table,update:null};calls.push(state);const b={select(){return b},eq(){return b},in(){return b},order(){return b},update(v){state.update=v;return b},maybeSingle(){return Promise.resolve({data:live,error:null})},then(resolve){return Promise.resolve({data:live,error:null}).then(resolve)}};return b}};
 const mod={exports:{}};
 new Function('require','exports','module',code)(name=>{
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init.status})}};
  if(name==='@/lib/mock-live')return liveModule;
  if(name==='@/lib/ark60-content-auth')return {getStudent:async()=>student,getAdmin:async()=>admin,isOwnOrigin:()=>origin,isDayOpen:async()=>true,isPreview:()=>false};
  if(name==='@/lib/supabase/server')return {getServiceSupabase:()=>db};
  throw Error(name);
 },mod.exports,mod);
 return {...mod.exports,calls};
}
const student={id:'11111111-1111-1111-1111-111111111111'};
const req=(action,extra={})=>({url:`https://example.test/api/challenge-mock?action=${action}&day=11&student_id=${student.id}`,json:async()=>({action,day:11,...extra})});
test('Admin live endpoint rejects unauthenticated viewers before reading learner data',async()=>{
 const api=setup();assert.equal((await api.GET(req('admin_live'))).status,401);assert.equal(api.calls.length,0);
});
test('Student live writes reject foreign origin and missing session',async()=>{
 assert.equal((await setup({origin:false}).POST(req('live_heartbeat'))).status,403);
 assert.equal((await setup().POST(req('live_consent'))).status,401);
});
test('Admin cannot view revoked or offline sharing',async()=>{
 for(const live of [{allowed:false},{allowed:true,heartbeat_at:new Date(Date.now()-30000).toISOString()}]){
  const api=setup({admin:{id:'admin'},live});const r=await api.GET(req('admin_live'));assert.equal(r.body.available,false);assert.ok(api.calls.every(c=>!c.update));
 }
});
test('Heartbeat never writes snapshots without consent or an active viewer',async()=>{
 let api=setup({student,live:{allowed:false}});assert.equal((await api.POST(req('live_heartbeat',{snapshot:{stage:'reading'}}))).body.watching,false);assert.ok(api.calls.every(c=>!c.update));
 api=setup({student,live:{allowed:true,viewed_at:null}});const r=await api.POST(req('live_heartbeat',{snapshot:{stage:'reading'}}));assert.equal(r.body.watching,false);assert.equal(api.calls.at(-1).update.snapshot,null);assert.ok(api.calls.every(c=>c.table==='ark60_mock_live'));
});
test('Active viewer receives bounded mock updates without touching exam attempts',async()=>{
 const api=setup({student,live:{allowed:true,viewed_at:new Date().toISOString()}});const r=await api.POST(req('live_heartbeat',{snapshot:{stage:'reading',rPassage:2,secret:'omit'}}));assert.equal(r.body.watching,true);assert.equal(api.calls.at(-1).update.snapshot.rPassage,2);assert.equal(api.calls.at(-1).update.snapshot.secret,undefined);assert.ok(api.calls.every(c=>c.table==='ark60_mock_live'));
});
