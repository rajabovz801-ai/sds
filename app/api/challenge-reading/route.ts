import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {isDayUnlocked} from "@/lib/ark60-content-auth";

export const dynamic="force-dynamic";
const SB=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://svdigxqdivcmljirjwhk.supabase.co").replace(/\/$/,"");
const KEY=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const previewName="rustam7";
function isMockDay(day:number){return Number.isInteger(day)&&day>=1&&day<=60&&new Date(Date.UTC(2026,9,day)).getUTCDay()===0}
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
 const usedPairAnswers=new Map<string,Set<string>>();
 const items=questions.map((q:J,i:number)=>{
  const correct=Array.isArray(keys[i])?keys[i]:[keys[i]];
  const given=String(submitted[String(q.number)]??"");
  const group=typeof q.pair_group==="string"?q.pair_group:"";
  const used=group?(usedPairAnswers.get(group)||new Set<string>()):null;
  const valid=!!normalize(given)&&correct.some((v:unknown)=>normalize(v)===normalize(given))&&(!used||!used.has(normalize(given)));
  if(valid&&used){used.add(normalize(given));usedPairAnswers.set(group,used)}
  const status=!normalize(given)?"empty":valid?"correct":"wrong";
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
  const rows=await db("ark60_reading_attempts","GET","select=student_id,day_number,ordinal,score,total,elapsed_seconds,submitted_at,passage_id,answers&day_number=eq."+day+"&order=submitted_at.desc");
  const students=await db("ark60_students","GET","select=id,first_name,last_name,username&status=eq.active&limit=2000");
  const passages=await catalogue(day);
  const allPublished=await db("ark60_reading_passages","GET","select=day_number,status&status=eq.published&order=day_number.asc");
  const availableDays=[...new Set(allPublished.map((p:J)=>Number(p.day_number)).filter((n:number)=>Number.isInteger(n)&&n>=1&&n<=60))]
   .map(day_number=>({day_number,passage_count:allPublished.filter((p:J)=>Number(p.day_number)===day_number).length}));
  const details=await db("ark60_reading_passages","GET","select=id,questions,answer_key,analysis&day_number=eq."+day);
  const users=new Map(students.map((s:J)=>[s.id,s]));
  const source=new Map(details.map((p:J)=>[p.id,p]));
  const realRows=rows.filter((a:J)=>String((users.get(a.student_id) as J|undefined)?.username||"").toLowerCase()!==previewName);
  return NextResponse.json({day,available_days:availableDays,passages,attempts:realRows.map((a:J)=>({...a,student:users.get(a.student_id)||null,
    review:source.get(a.passage_id)?reviewFor(source.get(a.passage_id) as J,a):null,
    answers:undefined
  }))});
 }
 const user=await viewer(req);if(!user)return err("Please sign in",401);
 const day=Number(url.searchParams.get("day"));if(!(await isDayUnlocked(day,user as any)))return err("This study day is locked",403);
 const rows=await catalogue(day);const attempts=user.username===previewName?[]:await completed(String(user.id),day);
 if(action==="list")return NextResponse.json({day,preview:user.username===previewName,passages:rows.filter((r:J)=>r.status==="published").map((r:J)=>({id:r.id,ordinal:r.ordinal,title:r.title,completed:attempts.find((a:J)=>a.passage_id===r.id)||null,locked:r.ordinal===2&&user.username!==previewName&&!attempts.some((a:J)=>a.ordinal===1)})),draft_count:rows.filter((r:J)=>r.status==="draft").length});
 if(action!=="passage")return err("Unknown action",404);
 if(isMockDay(day))return err("Use the Full Mock flow for this Sunday.",409);
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
 const declared=Number(req.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>50000)return err("Request too large",413);
 const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return err("Invalid origin",403);
 const user=await viewer(req);if(!user)return err("Please sign in",401);
 const b=await req.json();const day=Number(b.day),id=String(b.passage_id||"");
 if(isMockDay(day))return err("Use the Full Mock flow for this Sunday.",409);
 if(!(await isDayUnlocked(day,user as any))||!idValid(id))return err("Invalid day or passage",403);
 const row=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,questions,answer_key,analysis,status&id=eq."+id+"&day_number=eq."+day+"&status=eq.published&limit=1"))[0];
 if(!row)return err("Passage unavailable",404);
 const prev=user.username===previewName?[]:await completed(String(user.id),day);
 const existing=prev.find((a:J)=>a.passage_id===id);
 if(existing){
  const passage=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,title,passage_text,question_source,questions,answer_key,analysis&id=eq."+id+"&limit=1"))[0];
  const attempt=(await db("ark60_reading_attempts","GET","select=answers,score,total,elapsed_seconds,submitted_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  return NextResponse.json({ok:true,already_completed:true,result:existing,review:reviewFor(passage,attempt)});
 }
 if(row.ordinal===2&&user.username!==previewName&&!prev.some((a:J)=>a.ordinal===1))return err("Complete Passage 1 first",403);
 if(b.action==="start"||b.action==="resume"||b.action==="pause"){
  if(user.username===previewName){
   const elapsed=Math.max(0,Math.min(LIMIT,Number(b.elapsed_seconds)||0));
   const nowIso=new Date().toISOString();
   return NextResponse.json({ok:true,preview:true,timer:{
    started_at:nowIso,active_seconds:elapsed,resumed_at:b.action==="pause"?null:nowIso,
    is_running:b.action!=="pause",elapsed_seconds:elapsed
   }});
  }
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
 const questions=Array.isArray(row.questions)?row.questions:[];
 const key=Array.isArray(row.answer_key)?row.answer_key:[];
 if(user.username===previewName){
  if(!questions.length||key.length!==questions.length)return err("Answer key is not verified; submission disabled",503);
  if(!b.answers||typeof b.answers!=="object"||Array.isArray(b.answers))return err("Invalid answers");
  const answers=b.answers as Record<string,unknown>;
  let score=0;const usedPairAnswers=new Map<string,Set<string>>();
  for(let i=0;i<questions.length;i++){
   const q=questions[i],valid=Array.isArray(key[i])?key[i]:[key[i]];
   const group=typeof q.pair_group==="string"?q.pair_group:"";
   const used=group?(usedPairAnswers.get(group)||new Set<string>()):null;
   const given=normalize(answers[String(q.number)]);
   if(given&&valid.some((v:unknown)=>normalize(v)===given)&&(!used||!used.has(given))){
    score++;if(used){used.add(given);usedPairAnswers.set(group,used)}
   }
  }
  const seconds=Math.max(0,Math.min(LIMIT,Math.floor(Number(b.elapsed_seconds)||0)));
  const stamp=new Date().toISOString();
  return NextResponse.json({ok:true,preview:true,
   result:{id:"preview-"+id,score,total:questions.length,elapsed_seconds:seconds},
   review:reviewFor(row,{answers,score,total:questions.length,elapsed_seconds:seconds,submitted_at:stamp})
  });
 }
 let start=(await db("ark60_reading_starts","GET","select=started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
 if(!start){
  // Backward-compatibility for students who opened Reading before auto-start was deployed.
  // Never reject their answers just because the older tab did not create a timer row.
  await db("ark60_reading_starts","POST","on_conflict=student_id,passage_id",
   {student_id:user.id,passage_id:id},"resolution=ignore-duplicates");
  start=(await db("ark60_reading_starts","GET","select=started_at,active_seconds,resumed_at,is_running&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
 }
 if(!questions.length||key.length!==questions.length)return err("Answer key is not verified; submission disabled",503);
 if(!b.answers||typeof b.answers!=="object"||Array.isArray(b.answers))return err("Invalid answers");
 const answers=b.answers as Record<string,unknown>;
 let score=0;const usedPairAnswers=new Map<string,Set<string>>();for(let i=0;i<questions.length;i++){
  const q=questions[i],valid=Array.isArray(key[i])?key[i]:[key[i]];
  const group=typeof q.pair_group==="string"?q.pair_group:"";
  const used=group?(usedPairAnswers.get(group)||new Set<string>()):null;
  const given=normalize(answers[String(q.number)]);
  if(given&&valid.some((v:unknown)=>normalize(v)===given)&&(!used||!used.has(given))){score++;if(used){used.add(given);usedPairAnswers.set(group,used)}}
 }
 const seconds=timerState(start).elapsed_seconds;
 // Freeze the server clock on submission so reloading cannot extend the recorded study time.
 if(start.is_running)await db("ark60_reading_starts","PATCH","student_id=eq."+user.id+"&passage_id=eq."+id,
  {active_seconds:seconds,resumed_at:null,is_running:false},"return=minimal");
 const saved=await db("ark60_reading_attempts","POST","",{student_id:user.id,passage_id:id,day_number:day,ordinal:row.ordinal,answers,score,total:questions.length,elapsed_seconds:seconds},"return=representation");
 // Mirror completed reading work into the existing 60-day course metrics.
 // Only completed pairs count as a finished Reading module.
 try{
  const [done,passages]=await Promise.all([completed(String(user.id),day),catalogue(day)]);
  const published=passages.filter((p:J)=>p.status==="published");
  const doneIds=new Set(done.map((a:J)=>String(a.passage_id)));
  if(published.length>0&&published.every((p:J)=>doneIds.has(String(p.id)))){
   const summary={passages:done.map((a:J)=>({id:a.passage_id,score:a.score,total:a.total,elapsed_seconds:a.elapsed_seconds})),total_seconds:done.reduce((sum:number,a:J)=>sum+Number(a.elapsed_seconds||0),0)};
   await db("ark60_submissions","POST","on_conflict=student_id,day_number,module",{student_id:user.id,day_number:day,module:"reading",payload:summary,score:done.reduce((sum:number,a:J)=>sum+Number(a.score||0),0),review_status:"reviewed"},"resolution=merge-duplicates,return=minimal");
  }
 }catch(syncError){console.error("reading metric sync",syncError)}

 return NextResponse.json({ok:true,result:{id:saved[0]?.id,score,total:questions.length,elapsed_seconds:seconds},
  review:reviewFor(row,{answers,score,total:questions.length,elapsed_seconds:seconds,submitted_at:saved[0]?.submitted_at||new Date().toISOString()})});
 }catch(e){console.error("reading POST",e);return err("Unable to record reading result",503)}
}
