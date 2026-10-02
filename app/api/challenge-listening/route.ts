import {NextRequest,NextResponse} from "next/server";
import {getAdmin,getStudent,isDayUnlocked,isOwnOrigin,isPreview} from "@/lib/ark60-content-auth";
import {getServiceSupabase} from "@/lib/supabase/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type AnyObj=Record<string,any>;
const DAY=1;
const MODULE="listening";
const MAX_BODY=30000;

const json=(data:any,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
function norm(v:any){return String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:]+$/g,"").replace(/\s+/g," ")}
function bandFor(score:number){
 return score>=39?9:score>=37?8.5:score>=35?8:score>=32?7.5:score>=30?7:score>=26?6.5:score>=23?6:score>=18?5.5:score>=16?5:score>=13?4.5:score>=10?4:score>=6?3.5:score>=4?3:score>=3?2.5:score>=1?2:0;
}
async function getContent(day=DAY){
 const db=getServiceSupabase();
 const {data,error}=await db.from("ark60_content").select("id,day_number,module,title,status,payload,published_at").eq("day_number",day).eq("module",MODULE).eq("status","published").maybeSingle();
 if(error)throw error;
 return data;
}
function safePayload(payload:AnyObj){
 const {answer_key:_a,pair_groups:_p,...safe}=payload||{};
 return safe;
}
function buildChoiceMap(payload:AnyObj){
 const map=new Map<number,Set<string>>();
 for(const section of payload?.sections||[]){
  for(const block of section.blocks||[]){
   if(block.kind==="mcq"){
    for(const q of block.questions||[])map.set(Number(q.q),new Set(Object.keys(q.options||{})));
   }else if(block.kind==="matching"){
    const allowed=new Set(Object.keys(block.choices||{}));
    for(const q of block.items||[])map.set(Number(q.q),allowed);
   }else if(block.kind==="choose_two"){
    const allowed=new Set(Object.keys(block.options||{}));
    for(const q of block.questions||[])map.set(Number(q),allowed);
   }
  }
 }
 return map;
}
function sanitizeAnswers(payload:AnyObj,input:any){
 const out:Record<string,string>={};
 const choiceMap=buildChoiceMap(payload);
 for(let q=1;q<=40;q++){
  const raw=input&&typeof input==="object"&&!Array.isArray(input)?input[String(q)]:"";
  let value=String(raw??"").trim().slice(0,90);
  if(choiceMap.has(q)){
   value=value.toUpperCase();
   if(value&&!choiceMap.get(q)!.has(value))value="";
  }
  out[String(q)]=value;
 }
 return out;
}
function grade(payload:AnyObj,answers:Record<string,string>){
 const key=payload?.answer_key||{};
 const pairGroups=payload?.pair_groups||{};
 const pairByQuestion=new Map<number,{questions:number[];correct:string[]}>();
 for(const group of Object.values(pairGroups) as AnyObj[]){
  const g={questions:(group.questions||[]).map(Number),correct:(group.correct||[]).map(String)};
  for(const q of g.questions)pairByQuestion.set(q,g);
 }
 const statuses:Record<string,"correct"|"wrong"|"empty">={};
 const usedByGroup=new Map<string,Set<string>>();
 let score=0;
 for(let q=1;q<=40;q++){
  const given=norm(answers[String(q)]);
  if(!given){statuses[String(q)]="empty";continue}
  const group=pairByQuestion.get(q);
  let ok=false;
  if(group){
   const id=group.questions.join("-");
   const used=usedByGroup.get(id)||new Set<string>();
   ok=group.correct.some(v=>norm(v)===given)&&!used.has(given);
   if(ok){used.add(given);usedByGroup.set(id,used)}
  }else{
   const valid=Array.isArray(key[String(q)])?key[String(q)]:[key[String(q)]];
   ok=valid.some((v:any)=>norm(v)===given);
  }
  statuses[String(q)]=ok?"correct":"wrong";
  if(ok)score++;
 }
 const partScores=[1,11,21,31].map(start=>Array.from({length:10},(_,i)=>statuses[String(start+i)]==="correct"?1:0).reduce<number>((a,b)=>a+b,0));
 const review=Array.from({length:40},(_,i)=>{
  const q=i+1,group=pairByQuestion.get(q);
  const correct=group?group.correct:(Array.isArray(key[String(q)])?key[String(q)]:[key[String(q)]]);
  return {number:q,submitted:answers[String(q)]||"",correct,status:statuses[String(q)]};
 });
 return {score,band:bandFor(score),part_scores:partScores,review};
}
async function getAttempt(studentId:string,day=DAY){
 const db=getServiceSupabase();
 const {data,error}=await db.from("ark60_listening_attempts").select("*").eq("student_id",studentId).eq("day_number",day).maybeSingle();
 if(error)throw error;return data;
}
async function ensureSubmission(attempt:AnyObj){
 const db=getServiceSupabase();
 const payload={attempt_id:attempt.id,answers:attempt.answers||{},part_scores:attempt.part_scores||[],score:attempt.score,band:attempt.band,elapsed_seconds:attempt.elapsed_seconds,source:"listening-test-206-v1"};
 const {error}=await db.from("ark60_submissions").upsert({
  student_id:attempt.student_id,day_number:attempt.day_number,module:MODULE,payload,score:attempt.score,band:attempt.band,review_status:"reviewed"
 },{onConflict:"student_id,day_number,module"});
 if(error)throw error;
}
function attemptForClient(content:AnyObj,attempt:AnyObj|null){
 if(!attempt)return null;
 const base={id:attempt.id,day_number:attempt.day_number,status:attempt.status,answers:attempt.answers||{},started_at:attempt.started_at,submitted_at:attempt.submitted_at,elapsed_seconds:attempt.elapsed_seconds||0,part_scores:attempt.part_scores||null,score:attempt.score??null,band:attempt.band??null};
 if(attempt.status!=="submitted")return base;
 const graded=grade(content.payload,attempt.answers||{});
 return {...base,review:graded.review};
}

export async function GET(req:NextRequest){
 try{
  const url=new URL(req.url),action=url.searchParams.get("action")||"day";
  const requestedDay=Number(url.searchParams.get("day")||DAY);
  const db=getServiceSupabase();

  if(action==="admin_list"){
   const admin=await getAdmin(req);if(!admin)return json({detail:"Admin sign-in required."},401);
   const {data:allAttempts,error:allError}=await db.from("ark60_listening_attempts")
    .select("id,student_id,day_number,status,submitted_at,elapsed_seconds,part_scores,score,band")
    .eq("status","submitted").order("submitted_at",{ascending:false}).limit(500);
   if(allError)throw allError;
   const allRows=allAttempts||[];
   const dayNumbers=[...new Set(allRows.map(r=>Number(r.day_number)).filter(Boolean))].sort((a,b)=>a-b);
   const contentRows=dayNumbers.length?(await db.from("ark60_content").select("day_number,title").eq("module",MODULE).eq("status","published").in("day_number",dayNumbers)).data||[]:[];
   const titleMap=new Map(contentRows.map((r:any)=>[Number(r.day_number),String(r.title||"Listening")]));
   const requested=Number.isInteger(requestedDay)&&requestedDay>=1&&requestedDay<=60?requestedDay:(dayNumbers[0]||DAY);
   const rows=allRows.filter(r=>Number(r.day_number)===requested);
   const ids=[...new Set(allRows.map(r=>r.student_id))];
   let students:any[]=[];
   if(ids.length){const people=await db.from("ark60_students").select("id,first_name,last_name,username").in("id",ids);if(people.error)throw people.error;students=people.data||[]}
   const byId=new Map(students.filter(s=>String(s.username||"").toLowerCase()!=="rustam7").map(s=>[s.id,s]));
   const available_days=dayNumbers.map(day_number=>({
    day_number,title:titleMap.get(day_number)||("Listening Day "+day_number),
    submission_count:allRows.filter(r=>Number(r.day_number)===day_number&&byId.has(r.student_id)).length
   })).filter(x=>x.submission_count>0);
   return json({available_days,selected_day:requested,submissions:rows.filter(r=>byId.has(r.student_id)).map(r=>({...r,student:byId.get(r.student_id)}))});
  }

  if(action==="admin_detail"){
   const admin=await getAdmin(req);if(!admin)return json({detail:"Admin sign-in required."},401);
   const id=String(url.searchParams.get("id")||"");
   const {data:attempt,error}=await db.from("ark60_listening_attempts").select("*").eq("id",id).eq("status","submitted").maybeSingle();
   if(error||!attempt)return json({detail:"Listening result not found."},404);
   const content=await getContent(Number(attempt.day_number));
   if(!content)return json({detail:"Listening material has not been published yet."},404);
   const {data:student}=await db.from("ark60_students").select("id,first_name,last_name,username").eq("id",attempt.student_id).maybeSingle();
   if(String(student?.username||"").toLowerCase()==="rustam7")return json({detail:"Listening result not found."},404);
   const graded=grade(content.payload,attempt.answers||{});
   return json({submission:{...attempt,student,review:graded.review,content:{title:content.title,payload:safePayload(content.payload)}}});
  }

  const day=requestedDay;
  if(day!==DAY){
   if(action==="availability")return json({published:false});
   return json({detail:"Listening is not published for this day yet."},404);
  }
  const content=await getContent(day);
  if(action==="availability")return json({published:!!content,title:content?.title||""});
  if(!content)return json({detail:"Listening material has not been published yet."},404);

  const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
  if(!(await isDayUnlocked(day,student)))return json({detail:"This Listening task is not available yet."},403);
  if(isPreview(student))return json({content:{...content,payload:safePayload(content.payload)},attempt:null,preview:true});
  const attempt=await getAttempt(student.id,day);
  if(attempt?.status==="submitted")await ensureSubmission(attempt);
  return json({content:{...content,payload:safePayload(content.payload)},attempt:attemptForClient(content,attempt),preview:false});
 }catch(e){console.error("Listening GET",e);return json({detail:"Could not load Listening."},500)}
}

export async function POST(req:NextRequest){
 try{
  const declared=Number(req.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>MAX_BODY)return json({detail:"Request is too large."},413);
  if(!isOwnOrigin(req))return json({detail:"Invalid request origin."},403);
  const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
  const body=await req.json().catch(()=>null);if(!body||typeof body!=="object")return json({detail:"Invalid request body."},400);
  const day=Number(body.day||DAY);if(day!==DAY||!(await isDayUnlocked(day,student)))return json({detail:"This Listening task is unavailable."},403);
  const content=await getContent(day);if(!content)return json({detail:"Listening material has not been published yet."},404);
  const action=String(body.action||"");
  const db=getServiceSupabase();

  if(action==="start"){
   if(isPreview(student))return json({ok:true,preview:true,attempt:{id:"preview-listening-1",day_number:1,status:"in_progress",answers:{},started_at:new Date().toISOString(),elapsed_seconds:0}});
   let attempt=await getAttempt(student.id,day);
   if(!attempt){
    const ins=await db.from("ark60_listening_attempts").insert({student_id:student.id,day_number:day,status:"in_progress",answers:{}}).select("*").maybeSingle();
    if(ins.error){
     if(String(ins.error.code)==="23505")attempt=await getAttempt(student.id,day);
     else throw ins.error;
    }else attempt=ins.data;
   }
   if(!attempt)return json({detail:"Could not start Listening."},500);
   if(attempt.status==="submitted")await ensureSubmission(attempt);
   return json({ok:true,attempt:attemptForClient(content,attempt)});
  }

  if(action==="save"){
   const answers=sanitizeAnswers(content.payload,body.answers);
   if(isPreview(student))return json({ok:true,preview:true,answers});
   const id=String(body.attempt_id||"");
   const {data:attempt,error}=await db.from("ark60_listening_attempts").select("id,status").eq("id",id).eq("student_id",student.id).eq("day_number",day).maybeSingle();
   if(error||!attempt)return json({detail:"Listening attempt not found."},404);
   if(attempt.status!=="in_progress")return json({detail:"This Listening test is already complete."},409);
   const update=await db.from("ark60_listening_attempts").update({answers,updated_at:new Date().toISOString()}).eq("id",id).eq("student_id",student.id).eq("status","in_progress");
   if(update.error)throw update.error;
   return json({ok:true});
  }

  if(action==="submit"){
   const answers=sanitizeAnswers(content.payload,body.answers);
   const graded=grade(content.payload,answers);
   if(isPreview(student)){
    const elapsed=Math.max(0,Math.min(7200,Math.floor(Number(body.elapsed_seconds)||0)));
    return json({ok:true,preview:true,result:{score:graded.score,band:graded.band,part_scores:graded.part_scores,elapsed_seconds:elapsed,submitted_at:new Date().toISOString()},review:graded.review});
   }
   const id=String(body.attempt_id||"");
   let attempt=(await db.from("ark60_listening_attempts").select("*").eq("id",id).eq("student_id",student.id).eq("day_number",day).maybeSingle()).data;
   if(!attempt)return json({detail:"Listening attempt not found."},404);
   if(attempt.status==="submitted"){
    await ensureSubmission(attempt);
    const again=grade(content.payload,attempt.answers||{});
    return json({ok:true,already_submitted:true,result:{score:attempt.score,band:attempt.band,part_scores:attempt.part_scores,elapsed_seconds:attempt.elapsed_seconds,submitted_at:attempt.submitted_at},review:again.review});
   }
   const elapsed=Math.max(0,Math.min(7200,Math.floor((Date.now()-Date.parse(attempt.started_at))/1000)));
   const stamp=new Date().toISOString();
   const updated=await db.from("ark60_listening_attempts").update({status:"submitted",answers,submitted_at:stamp,updated_at:stamp,elapsed_seconds:elapsed,part_scores:graded.part_scores,score:graded.score,band:graded.band}).eq("id",attempt.id).eq("student_id",student.id).eq("status","in_progress").select("*").maybeSingle();
   if(updated.error)throw updated.error;
   attempt=updated.data||await getAttempt(student.id,day);
   if(!attempt)return json({detail:"Could not finish Listening."},500);
   await ensureSubmission(attempt);
   return json({ok:true,result:{score:graded.score,band:graded.band,part_scores:graded.part_scores,elapsed_seconds:elapsed,submitted_at:attempt.submitted_at},review:graded.review});
  }

  return json({detail:"Unknown action."},400);
 }catch(e){console.error("Listening POST",e);return json({detail:"Could not save Listening right now."},500)}
}
