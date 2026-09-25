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
 const passage=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,title,passage_text,question_source,questions,status&id=eq."+id+"&status=eq.published&limit=1"))[0];
 if(!passage)return err("Passage unavailable",404);
 const prior=attempts.find((a:J)=>a.passage_id===id);
 if(prior)return NextResponse.json({passage:safePassage(passage),completed:prior});
 const began=(await db("ark60_reading_starts","GET","select=started_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
 return NextResponse.json({passage:safePassage(passage),started_at:began?.started_at||null});
 }catch(e){console.error("reading GET",e);return err("Unable to load reading materials",503)}
}
export async function POST(req:NextRequest){
 try{
 const origin=req.headers.get("origin");if(origin&&origin!==new URL(req.url).origin)return err("Invalid origin",403);
 const user=await viewer(req);if(!user)return err("Please sign in",401);
 const b=await req.json();const day=Number(b.day),id=String(b.passage_id||"");
 if(!allowed(day,user)||!idValid(id))return err("Invalid day or passage",403);
 const row=(await db("ark60_reading_passages","GET","select=id,day_number,ordinal,questions,answer_key,status&id=eq."+id+"&day_number=eq."+day+"&status=eq.published&limit=1"))[0];
 if(!row)return err("Passage unavailable",404);
 const prev=await completed(String(user.id),day);
 const existing=prev.find((a:J)=>a.passage_id===id);
 if(existing)return NextResponse.json({ok:true,already_completed:true,result:existing});
 if(row.ordinal===2&&user.username!==previewName&&!prev.some((a:J)=>a.ordinal===1))return err("Complete Passage 1 first",403);
 if(b.action==="start"){
  await db("ark60_reading_starts","POST","on_conflict=student_id,passage_id",{student_id:user.id,passage_id:id},"resolution=ignore-duplicates");
  const start=(await db("ark60_reading_starts","GET","select=started_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
  return NextResponse.json({ok:true,started_at:start?.started_at});
 }
 if(b.action!=="submit")return err("Unknown action");
 const start=(await db("ark60_reading_starts","GET","select=started_at&student_id=eq."+user.id+"&passage_id=eq."+id+"&limit=1"))[0];
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
 const seconds=Math.max(0,Math.min(10800,Math.floor((Date.now()-Date.parse(start.started_at))/1000)));
 const saved=await db("ark60_reading_attempts","POST","",{student_id:user.id,passage_id:id,day_number:day,ordinal:row.ordinal,answers,score,total:questions.length,elapsed_seconds:seconds},"return=representation");
 return NextResponse.json({ok:true,result:{id:saved[0]?.id,score,total:questions.length,elapsed_seconds:seconds,answers:key.map((k:unknown,i:number)=>({number:questions[i].number,correct:k}))}});
 }catch(e){console.error("reading POST",e);return err("Unable to record reading result",503)}
}
