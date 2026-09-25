import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";

export const dynamic="force-dynamic";
const SB=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://svdigxqdivcmljirjwhk.supabase.co").replace(/\/$/,"");
const KEY=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const START=Date.UTC(2026,9,1);
const previewName="rustam7";
type J=Record<string,unknown>;
function err(message:string,status=400){return NextResponse.json({error:message},{status});}
async function db(table:string,method="GET",query="",body?:unknown,prefer=""){
 if(!KEY)throw new Error("Service database key is not configured");
 const url=SB+"/rest/v1/"+table+(query?"?"+query:"");
 const r=await fetch(url,{method,cache:"no-store",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok)throw new Error("Database error "+r.status+": "+(await r.text()).slice(0,130));
 const text=await r.text();return text?JSON.parse(text):[];
}
function digest(s:string){return createHash("sha256").update(s).digest("hex");}
async function viewer(req:NextRequest,admin=false){
 const token=req.cookies.get(admin?"ark60_admin":"ark60_session")?.value;
 if(!token)return null;
 const sessions=await db(admin?"ark60_admin_sessions":"ark60_sessions","GET","select="+(admin?"admin_id":"student_id")+",expires_at,revoked_at&token_hash=eq."+digest(token)+"&limit=1");
 const session=sessions[0];if(!session||session.revoked_at||Date.parse(session.expires_at)<=Date.now())return null;
 const rows=await db(admin?"ark60_admins":"ark60_students","GET","select="+(admin?"id,username,display_name,role,status":"id,username,first_name,last_name,status")+"&id=eq."+(admin?session.admin_id:session.student_id)+"&limit=1");
 return rows[0]?.status==="active"?rows[0]:null;
}
function dayDate(n:number){return new Date(START+(n-1)*86400000).toISOString().slice(0,10);}
function todayUZ(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function allowed(n:number,user:J){return Number.isInteger(n)&&n>=1&&n<=60&&(user.username===previewName||dayDate(n)<=todayUZ());}
function idValid(x:string){return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x);}
function normalize(s:unknown){return String(s??"").trim().normalize("NFKC").toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g," ").replace(/^[.,;:!?]+|[.,;:!?]+$/g,"");}
async function catalogue(day:number){return await db("ark60_reading_passages","GET","select=id,day_number,ordinal,title,status&day_number=eq."+day+"&order=ordinal.asc");}
async function completed(student:string,day:number){return await db("ark60_reading_attempts","GET","select=passage_id,ordinal,score,total,elapsed_seconds,submitted_at&student_id=eq."+student+"&day_number=eq."+day+"&order=ordinal.asc");}
function safePassage(row:J){return {id:row.id,day_number:row.day_number,ordinal:row.ordinal,title:row.title,text:row.passage_text,question_source:row.question_source,questions:row.questions};}
function reviewFor(passage:J,attempt:J){
 const questions=Array.isArray(passage.questions)?passage.questions:[];
 const keys=Array.isArray(passage.answer_key)?passage.answer_key:[];
 const analysis=Array.isArray(passage.analysis)?passage.analysis:[];
 const submitted=(attempt.answers&&typeof attempt.answers==="object"&&!Array.isArray(attempt.answers)?attempt.answers:{}) as J;
 const items=questions.map((q:J,i:number)=>{
  const correct=Array.isArray(keys[i])?keys[i]:[keys[i]];
  const given=String(submitted[String(q.number)]??"");
  const status=!normalize(given)?"empty":correct.some((v:unknown)=>normalize(v)===normalize(given))?"correct":"wrong";
  const proof=analysis.find((a:J)=>Number(a.number)===Number(q.number));
  return {number:q.number,question:q.text,type:q.type,submitted:given,correct,status,
   evidence:proof?{paragraph:Number(proof.paragraph),quote:proof.quote||"",pairs:proof.pairs||[],explanation:proof.explanation||"",note:proof.note||""}:null};
 });
 return {score:attempt.score,total:attempt.total,elapsed_seconds:attempt.elapsed_seconds,submitted_at:attempt.submitted_at,items};
}
const LIMIT=1200;
function timerState(row:J|null|undefined){
 const accumulated=Math.max(0,Number(row?.active_seconds||0));
 const is_running=row?.is_running===true;
 const resumed_at=is_running&&row?.resumed_at?String(row.resumed_at):null;
 const delta=resumed_at?Math.max(0,Math.floor((Date.now()-Date.parse(resumed_at))/1000)):0;
 return {started_at:row?.started_at||null,is_running,resumed_at,active_seconds:accumulated,elapsed_seconds:Math.min(LIMIT,accumulated+delta)};
}
export async function GET(req:NextRequest){
 try{
 const url=new URL(req.url);const action=url.searchParams.get("action")||"list";
 if(action==="admin"){
  const admin=await viewer(req,true);if(!admin)return err("Administrator login required",401);
  const day=Number(url.searchParams.get("day")||"1");if(day<1||day>60)return err("Invalid day");
  const rows=await db("ark60_reading_attempts","GET","select=student_id,day_number,ordinal,score,total,elapsed_seconds,submitted_at,passage_id&day_number=eq."+day+"&order=submitted_at.desc");
  const students=await db("ark60_students","GET","select=id,first_name,last_name,username&status=eq.active&limit=2000");
  const passages=await catalogue(day);
  const users=new Map(students.map((s:J)=>[s.id,s]));
  return NextResponse.json({day,passages,attempts:rows.map((a:J)=>({...a,student:users.get(a.student_id)||null}))});
 }
 const user=await viewer(req);if(!user)return err("Please sign in",401);
 const day=Number(url.searchParams.get("day"));if(!allowed(day,user))return err("This study day is locked",403);
 const rows=await catalogue(day);const attempts=await completed(String(user.id),day);
 if(action==="list")return NextResponse.json({day,preview:user.username===previewName,passages:rows.filter((r:J)=>r.status==="published").map((r:J)=>({id:r.id,ordinal:r.ordinal,title:r.title,completed:attempts.find((a:J)=>a.passage_id===r.id)||null,locked:r.ordinal===2&&user.username!==previewName&&!attempts.some((a:J)=>a.ordinal===1)})),draft_count:rows.filter((r:J)=>r.status==="draft").length});
 if(action!=="passage")return err("Unknown action",404);
 const id=url.searchParams.get("id")||"";if(!idValid(id))return err("Invalid passage");
 const meta=rows.find((r:J)=>r.id===id&&r.status==="published");if(!meta)return err("Passage not published",404);
 if(meta.ordinal===2&&user.username!==previewName&&!attempts.some((a:J)=>a.ordinal===1))return err("Finish the first passage to unlock this one",403);
 const passage=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,title,passage_text,question_source,questions,answer_key,analysis,status&id=eq."+id+"&status=eq.published&limit=1"))[0];
 if(!passage)return err("Passage unavailable",404);
 const prior=attempts.find((a:J)=>a.passage_id===id);
 if(prior){
  // Completion is checked before returning the key and explanations; only the
  // authenticated owner may retrieve their answers or review materials.
  const attempt=(await db("ark60_reading_attempts","GET","select=answers,score,total,elapsed_seconds,submitted_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  if(!attempt)return err("Unable to locate your saved answers",404);
  return NextResponse.json({passage:safePassage(passage),completed:prior,review:reviewFor(passage,attempt)});
 }
 const began=(await db("ark60_reading_starts","GET","select=started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
 return NextResponse.json({passage:safePassage(passage),timer:timerState(began)});
 }catch(e){console.error("reading GET",e);return err("Unable to load reading materials",503)}
}
export async function POST(req:NextRequest){
 try{
 const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return err("Invalid origin",403);
 const user=await viewer(req);if(!user)return err("Please sign in",401);
 const b=await req.json();const day=Number(b.day),id=String(b.passage_id||"");
 if(!allowed(day,user)||!idValid(id))return err("Invalid day or passage",403);
 const row=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,questions,answer_key,analysis,status&id=eq."+id+"&day_number=eq."+day+"&status=eq.published&limit=1"))[0];
 if(!row)return err("Passage unavailable",404);
 const prev=await completed(String(user.id),day);
 const existing=prev.find((a:J)=>a.passage_id===id);
 if(existing){
  const passage=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,title,passage_text,question_source,questions,answer_key,analysis&id=eq."+id+"&limit=1"))[0];
  const attempt=(await db("ark60_reading_attempts","GET","select=answers,score,total,elapsed_seconds,submitted_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  return NextResponse.json({ok:true,already_completed:true,result:existing,review:reviewFor(passage,attempt)});
 }
 if(row.ordinal===2&&user.username!==previewName&&!prev.some((a:J)=>a.ordinal===1))return err("Complete Passage 1 first",403);
 if(b.action==="start"||b.action==="resume"||b.action==="pause"){
  if(b.action!=="pause"){
   await db("ark60_reading_starts","POST","on_conflict=student_id,passage_id",
    {student_id:user.id,passage_id:id},"resolution=ignore-duplicates");
  }
  const start=(await db("ark60_reading_starts","GET","select=student_id,passage_id,started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  if(!start)return err("Start the passage before pausing",409);
  const snapshot=timerState(start);
  if(b.action==="pause"&&snapshot.is_running){
   await db("ark60_reading_starts","PATCH","student_id=eq."+user.id+"&passage_id=eq."+id,
     {active_seconds:snapshot.elapsed_seconds,resumed_at:null,is_running:false},"return=minimal");
  }else if(b.action!=="pause"&&!snapshot.is_running&&snapshot.elapsed_seconds<LIMIT){
   await db("ark60_reading_starts","PATCH","student_id=eq."+user.id+"&passage_id=eq."+id,
     {resumed_at:new Date().toISOString(),is_running:true},"return=minimal");
  }
  const updated=(await db("ark60_reading_starts","GET","select=started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  return NextResponse.json({ok:true,timer:timerState(updated)});
 }
 if(b.action!=="submit")return err("Unknown action");
 const start=(await db("ark60_reading_starts","GET","select=started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
 if(!start)return err("Start the passage before submitting",409);
 const questions=Array.isArray(row.questions)?row.questions:[];
 const key=Array.isArray(row.answer_key)?row.answer_key:[];
 if(!questions.length||key.length!==questions.length)return err("Answer key is not verified; submission disabled",503);
 if(!b.answers||typeof b.answers!=="object"||Array.isArray(b.answers))return err("Invalid answers");
 const answers=b.answers as Record<string,unknown>;
 let score=0;for(let i=0;i<questions.length;i++){
  const q=questions[i],valid=Array.isArray(key[i])?key[i]:[key[i]];
  if(valid.some((v:unknown)=>normalize(v)===normalize(answers[String(q.number)]))&&normalize(answers[String(q.number)]))score++;
 }
 const seconds=timerState(start).elapsed_seconds;
 // Freeze the server clock on submission so reloading cannot extend the recorded study time.
 if(start.is_running)await db("ark60_reading_starts","PATCH","student_id=eq."+user.id+"&passage_id=eq."+id,
  {active_seconds:seconds,resumed_at:null,is_running:false},"return=minimal");
 const saved=await db("ark60_reading_attempts","POST","",{student_id:user.id,passage_id:id,day_number:day,ordinal:row.ordinal,answers,score,total:questions.length,elapsed_seconds:seconds},"return=representation");
 // Mirror completed reading work into the existing 60-day course metrics.
 // Only completed pairs count as a finished Reading module.
 try{
  const date=todayUZ();
  const existingTime=(await db("ark60_study_sessions","GET","select=id,active_seconds&student_id=eq."+user.id+"&study_date=eq."+date+"&day_number=eq."+day+"&module=eq.reading&order=last_active_at.desc&limit=1"))[0];
  if(existingTime){
   await db("ark60_study_sessions","PATCH","id=eq."+existingTime.id,{active_seconds:Number(existingTime.active_seconds||0)+seconds,last_active_at:new Date().toISOString()},"return=minimal");
  }else{
   await db("ark60_study_sessions","POST","",{student_id:user.id,study_date:date,day_number:day,module:"reading",active_seconds:seconds,last_active_at:new Date().toISOString()},"return=minimal");
  }
  const previous=prev.find((x:J)=>Number(x.ordinal)!==Number(row.ordinal));
  if(previous){
   const summary={passages:[{id:previous.passage_id,score:previous.score,total:previous.total,elapsed_seconds:previous.elapsed_seconds},{id,score,total:questions.length,elapsed_seconds:seconds}],total_seconds:Number(previous.elapsed_seconds||0)+seconds};
   await db("ark60_submissions","POST","on_conflict=student_id,day_number,module",{student_id:user.id,day_number:day,module:"reading",payload:summary,score:Number(previous.score||0)+score,review_status:"reviewed"},"resolution=merge-duplicates,return=minimal");
  }
 }catch(syncError){console.error("reading metric sync",syncError)}

 return NextResponse.json({ok:true,result:{id:saved[0]?.id,score,total:questions.length,elapsed_seconds:seconds},
  review:reviewFor(row,{answers,score,total:questions.length,elapsed_seconds:seconds,submitted_at:saved[0]?.submitted_at||new Date().toISOString()})});
 }catch(e){console.error("reading POST",e);return err("Unable to record reading result",503)}
}
