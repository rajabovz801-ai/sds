import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
const policy={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('lib/mock-access-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(policy.exports);
function load(path,deps){const m={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports','module',js)(name=>{
 if(name==='next/server')return {NextResponse:{json:(value,options)=>new Response(JSON.stringify(value),{...options,headers:{...options?.headers,'Content-Type':'application/json'}})}};
 if(name==='@/lib/mock-access-policy')return policy.exports;
 if(name in deps)return deps[name];
 throw Error('Unexpected dependency '+name);
},m.exports,m);return m.exports;}
const uuid='11111111-1111-4111-8111-111111111111';
const request=(body)=>({url:'https://example.test/api/mock-access',headers:new Headers(),json:async()=>body});
function access({admin=null,student={id:uuid},origin=true,status='ok'}={}){
 const calls=[];const db={rpc:async(name,args)=>{calls.push({name,args});return {data:name.endsWith('issue')?{id:'code-id'}:{status,retry_at:'2026-10-18T04:15:00Z'},error:null}}};
 const route=load('app/api/mock-access/route.ts',{'node:crypto':{createHash,randomBytes:()=>Buffer.from('abcdef123456','hex')},'@/lib/ark60-content-auth':{getAdmin:async()=>admin,getStudent:async()=>student,isOwnOrigin:()=>origin,isUuid:s=>/^[0-9a-f-]{36}$/i.test(s)},'@/lib/supabase/server':{getServiceSupabase:()=>db}});
 return {route,calls};
}
test('Code management requires super-admin and explicit payment confirmation',async()=>{
 for(const admin of [null,{id:uuid,role:'admin'}]){const t=access({admin});assert.equal((await t.route.POST(request({day:18,action:'issue',student_id:uuid,payment_confirmed:true}))).status,403);assert.equal(t.calls.length,0)}
 const t=access({admin:{id:uuid,role:'super_admin'}});
 assert.equal((await t.route.POST(request({day:18,action:'issue',student_id:uuid,payment_confirmed:false}))).status,400);
 const response=await t.route.POST(request({day:18,action:'issue',student_id:uuid,payment_confirmed:true}));const result=await response.json();
 assert.equal(result.code,'ABCD-EF12-3456');assert.equal(t.calls[0].args.p_hash,createHash('sha256').update('ABCDEF123456').digest('hex'));assert.equal(result.code_hash,undefined);
});
test('Redemption uses the signed-in account, counts invalid attempts, and returns server lockout',async()=>{
 const t=access();const r=await t.route.POST(request({day:18,action:'redeem',student_id:'someone-else',code:'abcd-ef12-3456'}));assert.equal(r.status,200);assert.equal(t.calls[0].args.p_student,uuid);
 const locked=access({status:'locked'});assert.equal((await locked.route.POST(request({day:18,action:'redeem',code:'bad'}))).status,429);assert.equal(locked.calls.length,1);
 const noSession=access({student:null});assert.equal((await noSession.route.POST(request({day:18,action:'redeem',code:'abcd-ef12-3456'}))).status,401);
 const foreign=access({origin:false});assert.equal((await foreign.route.POST(request({day:18,action:'issue'}))).status,403);assert.equal(foreign.calls.length,0);
});
test('Every Day 18 material and write endpoint denies unredeemed or not-yet-open access before content queries',async()=>{
 for(const entry of ['code_required','scheduled']){
  let reads=0;
  const route=load('app/api/challenge-mock/route.ts',{'@/lib/mock-access':{mockEntryForStudent:async()=>entry},'@/lib/mock-live':{},'@/lib/ark60-content-auth':{getStudent:async()=>({id:uuid}),getAdmin:async()=>null,isOwnOrigin:()=>true,isPreview:()=>false,isDayOpen:async()=>true,isDayUnlocked:async()=>true},'@/lib/supabase/server':{getServiceSupabase:()=>({from(){reads++;throw Error('Private data must not be queried')}})}});
  const r=await route.GET({url:'https://example.test/api/challenge-mock?day=18'});assert.equal(r.status,403);assert.equal((await r.json()).content,undefined);
  for(const action of ['start','start_listening','live_consent','save_reading','submit_reading','submit_writing','live_heartbeat','live_resume'])assert.equal((await route.POST(request({day:18,action}))).status,403);
  assert.equal(reads,0);
 }
});
