import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sharp=require('sharp');
const {NextRequest}=require('next/server');
const code=ts.transpileModule(fs.readFileSync('app/api/profile-photo/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function setup({paid=true,logged=true}={}){
 let stored,saved;const from=()=>({upload:async(path,bytes)=>{stored={path,bytes};return {error:null}},getPublicUrl:path=>({data:{publicUrl:'https://example.com/'+path}}),remove:async()=>({error:null})});
 const db={storage:{from},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})}),upsert:async row=>{saved=row;return {error:null}}})};
 const module={exports:{}};
 const local=id=>id==='@/lib/ark60-content-auth'?{getStudent:async()=>logged?{id:'student-1'}:null,isOwnOrigin:r=>!r.headers.get('origin')||r.headers.get('origin')==='https://ark.test',membershipForStudent:async()=>({challenge_until:paid?'2099-01-01T00:00:00Z':null})}:id==='@/lib/supabase/server'?{getServiceSupabase:()=>db}:require(id);
 new Function('require','module','exports',code)(local,module,module.exports);
 return {api:module.exports,stored:()=>stored,saved:()=>saved};
}
function request(bytes=Buffer.from('bad'),headers={}){const form=new FormData();form.append('photo',new File([bytes],'photo.jpg',{type:'image/jpeg'}));return new NextRequest('https://ark.test/api/profile-photo',{method:'POST',body:form,headers})}
test('photo upload requires a session',async()=>{const s=setup({logged:false});assert.equal((await s.api.POST(request())).status,401);assert.equal(s.stored(),undefined)});
test('free and mock-only members cannot upload',async()=>{const s=setup({paid:false});assert.equal((await s.api.POST(request())).status,403);assert.equal(s.stored(),undefined)});
test('cross-origin requests cannot mutate photos',async()=>{assert.equal((await setup().api.POST(request(undefined,{origin:'https://evil.test'}))).status,403)});
test('invalid image bytes are rejected before storage',async()=>{const s=setup();assert.equal((await s.api.POST(request())).status,400);assert.equal(s.stored(),undefined)});
test('paid upload stores a normalized square WebP owned by the session student',async()=>{const s=setup(),bytes=await sharp({create:{width:700,height:300,channels:3,background:'#123456'}}).jpeg().toBuffer();const response=await s.api.POST(request(bytes));assert.equal(response.status,200);const meta=await sharp(s.stored().bytes).metadata();assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);assert.match(s.stored().path,/^student-1\//);assert.equal(s.saved().student_id,'student-1');assert.equal(s.saved().photo_enabled,true)});
