import {NextRequest,NextResponse} from "next/server";
import {getAdmin,getStudent,isDayOpen,isOwnOrigin,isPreview} from "@/lib/ark60-content-auth";
import {getServiceSupabase} from "@/lib/supabase/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Obj=Record<string,any>;
const DAY=4;
const MOCK_START=Date.UTC(2026,9,4,5,0,0); // 10:00 Asia/Tashkent
const json=(body:any,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});

function norm(v:any){
 return String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[\u200b-\u200d\ufeff]/g,"").replace(/[’‘]/g,"'").replace(/\s*[-–—]\s*/g," ").replace(/[.,!?;:]+$/g,"").replace(/\s+/g," ").trim();
}
function listeningBand(score:number){
 return score>=39?9:score>=37?8.5:score>=35?8:score>=32?7.5:score>=30?7:score>=26?6.5:score>=23?6:score>=18?5.5:score>=16?5:score>=13?4.5:score>=10?4:score>=6?3.5:score>=4?3:score>=3?2.5:score>=1?2:0;
}
function readingBand(score:number){
 if(score>=39)return 9;if(score>=37)return 8.5;if(score>=35)return 8;if(score>=33)return 7.5;if(score>=30)return 7;if(score>=27)return 6.5;if(score>=23)return 6;if(score>=19)return 5.5;if(score>=15)return 5;if(score>=13)return 4.5;if(score>=10)return 4;if(score>=8)return 3.5;if(score>=6)return 3;if(score>=4)return 2.5;if(score>=1)return 2;return 0;
}
function safeListening(payload:Obj){const {answer_key:_a,pair_groups:_p,...safe}=payload||{};return safe}
function safeReading(row:Obj){return {id:row.id,ordinal:row.ordinal,title:row.title,text:row.passage_text,question_source:row.question_source,questions:row.questions}}
function safeWriting(payload:Obj){return {version:payload.version,mock:true,duration_seconds:Number(payload.duration_seconds||3600),tasks:Array.isArray(payload.tasks)?payload.tasks:[]}}

async function source(){
 const db=getServiceSupabase();
 const [l,r,w]=await Promise.all([
  db.from("ark60_content").select("id,title,payload,status").eq("day_number",DAY).eq("module","listening").eq("status","published").maybeSingle(),
  db.from("ark60_reading_passages").select("id,ordinal,title,passage_text,question_source,questions,answer_key,status").eq("day_number",DAY).eq("status","published").order("ordinal"),
  db.from("ark60_content").select("id,title,payload,status").eq("day_number",DAY).eq("module","writing").eq("status","published").maybeSingle()
 ]);
 if(l.error)throw l.error;if(r.error)throw r.error;if(w.error)throw w.error;
 const passages=r.data||[];
 if(!l.data||!w.data||passages.length!==3)return null;
 return {listening:l.data,reading:passages,writing:w.data};
}
function sanitizeListening(payload:Obj,input:any){
 const out:Record<string,string>={};
 const allowed=new Map<number,Set<string>>();
 for(const section of payload.sections||[])for(const block of section.blocks||[]){
  if(block.kind==="mcq")for(const q of block.questions||[])allowed.set(Number(q.q),new Set(Object.keys(q.options||{})));
  if(block.kind==="matching")for(const q of block.items||[])allowed.set(Number(q.q),new Set(Object.keys(block.choices||{})));
  if(block.kind==="choose_two"||block.kind==="choose_many")for(const q of block.questions||[])allowed.set(Number(q),new Set(Object.keys(block.options||{})));
 }
 for(let q=1;q<=40;q++){
  let v=String(input?.[String(q)]??"").trim().slice(0,100);
  if(allowed.has(q)){v=v.toUpperCase();if(v&&!allowed.get(q)!.has(v))v=""}
  out[String(q)]=v;
 }
 return out;
}
function gradeListening(payload:Obj,answers:Record<string,string>){
 const key=payload.answer_key||{},groups=payload.pair_groups||{};
 const byQ=new Map<number,{id:string;correct:string[]}>();
 for(const [id,g] of Object.entries(groups) as [string,any][]){for(const q of g.questions||[])byQ.set(Number(q),{id,correct:(g.correct||[]).map(String)})}
 const used=new Map<string,Set<string>>();const status:Record<string,boolean>={};let score=0;
 for(let q=1;q<=40;q++){
  const given=norm(answers[String(q)]);let ok=false;
  const group=byQ.get(q);
  if(group){
   const set=used.get(group.id)||new Set<string>();
   ok=!!given&&group.correct.some(v=>norm(v)===given)&&!set.has(given);
   if(ok){set.add(given);used.set(group.id,set)}
  }else{
   const valid=Array.isArray(key[String(q)])?key[String(q)]:[key[String(q)]];
   ok=!!given&&valid.some((v:any)=>norm(v)===given);
  }
  status[String(q)]=ok;if(ok)score++;
 }
 const part_scores=[1,11,21,31].map(start=>Array.from({length:10},(_,i)=>Number(status[String(start+i)])).reduce((a,b)=>a+b,0));
 return {score,band:listeningBand(score),part_scores};
}
function sanitizeReading(input:any){
 const out:Record<string,string>={};for(let q=1;q<=40;q++)out[String(q)]=String(input?.[String(q)]??"").trim().slice(0,160);return out;
}
function gradeReading(passages:Obj[],answers:Record<string,string>){
 let score=0;const part_scores:number[]=[];
 for(const passage of passages){
  const qs=Array.isArray(passage.questions)?passage.questions:[],key=Array.isArray(passage.answer_key)?passage.answer_key:[];
  let part=0;
  for(let i=0;i<qs.length;i++){
   const q=qs[i],valid=Array.isArray(key[i])?key[i]:[key[i]],given=norm(answers[String(q.number)]);
   if(given&&valid.some((v:any)=>norm(v)===given)){score++;part++}
  }
  part_scores.push(part);
 }
 return {score,band:readingBand(score),part_scores};
}
function roundHalf(v:number){return Math.round(v*2)/2}
function overall3(l:number,r:number,w:number){return roundHalf((l+r+w)/3)}

const WRITING_SCHEMA={
 type:"object",
 additionalProperties:false,
 properties:{
  task1:{
   type:"object",additionalProperties:false,
   properties:{
    task_achievement:{type:"number"},
    coherence_cohesion:{type:"number"},
    lexical_resource:{type:"number"},
    grammar:{type:"number"},
    band:{type:"number"},
    feedback:{type:"string"}
   },
   required:["task_achievement","coherence_cohesion","lexical_resource","grammar","band","feedback"]
  },
  task2:{
   type:"object",additionalProperties:false,
   properties:{
    task_response:{type:"number"},
    coherence_cohesion:{type:"number"},
    lexical_resource:{type:"number"},
    grammar:{type:"number"},
    band:{type:"number"},
    feedback:{type:"string"}
   },
   required:["task_response","coherence_cohesion","lexical_resource","grammar","band","feedback"]
  },
  writing_band:{type:"number"},
  summary:{type:"string"}
 },
 required:["task1","task2","writing_band","summary"]
};

function responseOutputText(obj:any){
 if(typeof obj?.output_text==="string"&&obj.output_text.trim())return obj.output_text.trim();
 return (Array.isArray(obj?.output)?obj.output:[])
  .flatMap((item:any)=>Array.isArray(item?.content)?item.content:[])
  .filter((part:any)=>part?.type==="output_text"&&typeof part?.text==="string")
  .map((part:any)=>part.text)
  .join("")
  .trim();
}
function clampBand(v:any){return roundHalf(Math.max(0,Math.min(9,Number(v)||0)))}
function normalizeAssessment(parsed:any){
 const out={...parsed,task1:{...(parsed?.task1||{})},task2:{...(parsed?.task2||{})}};
 for(const k of ["task_achievement","coherence_cohesion","lexical_resource","grammar","band"])out.task1[k]=clampBand(out.task1[k]);
 for(const k of ["task_response","coherence_cohesion","lexical_resource","grammar","band"])out.task2[k]=clampBand(out.task2[k]);
 out.writing_band=roundHalf((Number(out.task1.band)+Number(out.task2.band)*2)/3);
 out.task1.feedback=String(out.task1.feedback||"").slice(0,1200);
 out.task2.feedback=String(out.task2.feedback||"").slice(0,1200);
 out.summary=String(out.summary||"").slice(0,1600);
 return out;
}

async function gradeWriting(task1:string,task2:string,content:Obj){
 const key=process.env.OPENAI_API_KEY||"";
 if(!key)return {ok:false,error:"OpenAI API key is not configured yet."};
 const model=process.env.OPENAI_WRITING_MODEL||"gpt-5-mini";
 const tasks=Array.isArray(content.tasks)?content.tasks:[];
 const t1=tasks[0]||{},t2=tasks[1]||{};
 const prompt=`You are an IELTS Academic Writing examiner. Assess both responses using IELTS Academic Writing band descriptors. Be strict, consistent and evidence-based.

TASK 1 PROMPT:
${t1.prompt||""}

STUDENT TASK 1:
${task1}

TASK 2 PROMPT:
${t2.prompt||""}

STUDENT TASK 2:
${task2}

Score each criterion and each task from 0 to 9 in 0.5 increments. Task 2 contributes twice as much as Task 1 to the final Writing band. Keep feedback concise and useful.`;
 const response=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",
  headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
  body:JSON.stringify({
   model,
   input:prompt,
   max_output_tokens:1800,
   text:{format:{type:"json_schema",name:"ielts_writing_assessment",strict:true,schema:WRITING_SCHEMA}}
  })
 });
 if(!response.ok){
  console.error("writing AI request failed",response.status,await response.text().catch(()=>""));
  return {ok:false,error:"AI assessment request failed ("+response.status+")."};
 }
 const obj=await response.json();
 const text=responseOutputText(obj);
 if(!text){
  console.error("writing AI empty output",obj?.status,obj?.incomplete_details||null);
  return {ok:false,error:"AI assessment returned no result."};
 }
 try{
  const assessment=normalizeAssessment(JSON.parse(text));
  return {ok:true,band:assessment.writing_band,assessment,model};
 }catch(e){
  console.error("writing AI parse failed",String(e),text.slice(0,500));
  return {ok:false,error:"AI assessment returned an invalid format."};
 }
}

async function attempt(studentId:string){
 const db=getServiceSupabase();const {data,error}=await db.from("ark60_mock_attempts").select("*").eq("student_id",studentId).eq("day_number",DAY).maybeSingle();if(error)throw error;return data;
}
async function ensureAttempt(studentId:string){
 const db=getServiceSupabase();let row=await attempt(studentId);if(row)return row;
 const ins=await db.from("ark60_mock_attempts").insert({student_id:studentId,day_number:DAY,stage:"listening",status:"in_progress"}).select("*").single();
 if(ins.error){row=await attempt(studentId);if(row)return row;throw ins.error}
 return ins.data;
}
function remaining(started:string|null,limit:number){
 if(!started)return limit;return Math.max(0,limit-Math.floor((Date.now()-Date.parse(started))/1000));
}
function stateForClient(row:Obj|null,preview:boolean){
 if(preview||!row)return {stage:"not_started",status:"ready",reading_remaining:3600,writing_remaining:3600};
 return {
  stage:row.stage,status:row.status,
  reading_remaining:remaining(row.reading_started_at,3600),
  writing_remaining:remaining(row.writing_started_at,3600),
  listening_answers:row.stage==="listening"?row.listening_answers:{},
  reading_answers:row.stage==="reading"?row.reading_answers:{},
  writing_task1:["writing","assessing"].includes(row.stage)?row.writing_task1:"",
  writing_task2:["writing","assessing"].includes(row.stage)?row.writing_task2:"",
  completed_at:row.completed_at||null,
  result:row.stage==="completed"?{
   listening:{score:row.listening_score,band:Number(row.listening_band),parts:row.listening_part_scores||[]},
   reading:{score:row.reading_score,band:Number(row.reading_band),parts:row.reading_part_scores||[]},
   writing:{band:Number(row.writing_band),assessment:row.writing_assessment||null},
   overall:overall3(Number(row.listening_band),Number(row.reading_band),Number(row.writing_band))
  }:null
 };
}
async function mirrorCompletion(row:Obj,src:Obj){
 const db=getServiceSupabase();
 const now=new Date().toISOString();
 // Listening completion record + submission
 const existingL=await db.from("ark60_listening_attempts").select("id").eq("student_id",row.student_id).eq("day_number",DAY).limit(1).maybeSingle();
 if(!existingL.data){
  await db.from("ark60_listening_attempts").insert({student_id:row.student_id,day_number:DAY,attempt_number:1,status:"submitted",answers:row.listening_answers,part_scores:row.listening_part_scores,score:row.listening_score,band:row.listening_band,elapsed_seconds:row.listening_elapsed_seconds,submitted_at:row.listening_submitted_at||now});
 }
 await db.from("ark60_submissions").upsert({student_id:row.student_id,day_number:DAY,module:"listening",payload:{source:"full_mock",score:row.listening_score,part_scores:row.listening_part_scores},score:row.listening_score,band:row.listening_band,review_status:"reviewed"},{onConflict:"student_id,day_number,module"});
 // Reading passage completions
 let offset=0;const each=Math.floor(Number(row.reading_elapsed_seconds||0)/3);
 for(const p of src.reading){
  const qs=Array.isArray(p.questions)?p.questions:[],subset:Record<string,string>={};let part=0;
  for(const q of qs){subset[String(q.number)]=row.reading_answers?.[String(q.number)]||""}
  const graded=gradeReading([p],subset);part=graded.score;
  await db.from("ark60_reading_attempts").upsert({student_id:row.student_id,passage_id:p.id,day_number:DAY,ordinal:p.ordinal,answers:subset,score:part,total:qs.length,elapsed_seconds:each},{onConflict:"student_id,passage_id"});
  offset+=qs.length;
 }
 // Writing completion record
 await db.from("ark60_submissions").upsert({student_id:row.student_id,day_number:DAY,module:"writing",payload:{source:"full_mock",task_type:"full_mock",task1_answer:row.writing_task1,task2_answer:row.writing_task2,assessment:row.writing_assessment,duration_seconds:row.writing_elapsed_seconds},band:row.writing_band,review_status:"reviewed",review_feedback:String(row.writing_assessment?.summary||"AI assessed"),reviewed_at:now},{onConflict:"student_id,day_number,module"});
}

function retryCount(error:any){
 const m=String(error||"").match(/^retry:(\d+):/);
 return m?Number(m[1]):0;
}
async function completeWriting(row:Obj,assessed:any,src:Obj){
 const db=getServiceSupabase(),now=new Date().toISOString();
 const upd=await db.from("ark60_mock_attempts").update({
  stage:"completed",status:"completed",
  writing_band:assessed.band,writing_assessment:assessed.assessment,
  grading_error:null,completed_at:now,updated_at:now
 }).eq("id",row.id).select("*").single();
 if(upd.error)throw upd.error;
 await mirrorCompletion(upd.data,src);
 return upd.data;
}
async function retryFailedAssessments(src:Obj,limit=2){
 const db=getServiceSupabase();
 const q=await db.from("ark60_mock_attempts").select("*")
  .eq("day_number",DAY).eq("stage","assessing").not("grading_error","is",null)
  .order("updated_at",{ascending:true}).limit(8);
 if(q.error)throw q.error;
 const candidates=(q.data||[]).filter((row:any)=>String(row.grading_error||"")!=="retrying"&&retryCount(row.grading_error)<3).slice(0,limit);
 await Promise.all(candidates.map(async(row:any)=>{
  const currentError=String(row.grading_error||"");
  const nextTry=retryCount(currentError)+1;
  const claim=await db.from("ark60_mock_attempts")
   .update({grading_error:"retrying",updated_at:new Date().toISOString()})
   .eq("id",row.id).eq("stage","assessing").eq("grading_error",currentError)
   .select("*").maybeSingle();
  if(claim.error||!claim.data)return;
  const assessed=await gradeWriting(String(row.writing_task1||""),String(row.writing_task2||""),src.writing.payload);
  if(assessed.ok){
   await completeWriting(claim.data,assessed,src);
  }else{
   await db.from("ark60_mock_attempts").update({
    grading_error:"retry:"+nextTry+":"+assessed.error,
    updated_at:new Date().toISOString()
   }).eq("id",row.id).eq("stage","assessing");
  }
 }));
}


export async function GET(req:NextRequest){
 try{
  const url=new URL(req.url),action=url.searchParams.get("action")||"state";
  const src=await source();
  if(action==="availability")return json({published:!!src,open:Date.now()>=MOCK_START,opens_at:"2026-10-04T10:00:00+05:00"});
  const admin=action.startsWith("admin_")?await getAdmin(req):null;
  if(action.startsWith("admin_")){
   if(!admin)return json({detail:"Admin sign-in required."},401);
   if(src&&action==="admin_list")await retryFailedAssessments(src,2);
   const db=getServiceSupabase();
   const {data,error}=await db.from("ark60_mock_attempts").select("*").eq("day_number",DAY).order("updated_at",{ascending:false});
   if(error)throw error;
   const ids=[...new Set((data||[]).map(x=>x.student_id))];let students:any[]=[];
   if(ids.length){const q=await db.from("ark60_students").select("id,first_name,last_name,username").in("id",ids);if(q.error)throw q.error;students=q.data||[]}
   const people=new Map(students.filter(s=>String(s.username).toLowerCase()!=="rustam7").map(s=>[s.id,s]));
   return json({day:DAY,attempts:(data||[]).filter(x=>people.has(x.student_id)).map(x=>({...x,student:people.get(x.student_id)}))});
  }
  const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
  if(!src)return json({detail:"Full Mock materials are not published yet."},404);
  if(!(await isDayOpen(DAY,student)))return json({detail:"Full Mock opens at 10:00 Uzbekistan time.",opens_at:"2026-10-04T10:00:00+05:00"},403);
  const preview=isPreview(student);let row=preview?null:await attempt(student.id);
  if(!preview&&row?.stage==="assessing"&&row?.grading_error&&String(row.grading_error)!=="retrying"&&retryCount(row.grading_error)<3){
   await retryFailedAssessments(src,1);
   row=await attempt(student.id);
  }
  return json({preview,day:DAY,content:{listening:{title:src.listening.title,payload:safeListening(src.listening.payload)},reading:src.reading.map(safeReading),writing:{title:src.writing.title,payload:safeWriting(src.writing.payload)}},mock:stateForClient(row,preview)});
 }catch(e){console.error("mock GET",e);return json({detail:"Could not load Full Mock."},500)}
}

export async function POST(req:NextRequest){
 try{
  if(!isOwnOrigin(req))return json({detail:"Invalid request origin."},403);
  const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
  if(!(await isDayOpen(DAY,student)))return json({detail:"Full Mock opens at 10:00 Uzbekistan time."},403);
  const src=await source();if(!src)return json({detail:"Full Mock materials are not published yet."},404);
  const body=await req.json().catch(()=>null);if(!body||typeof body!=="object")return json({detail:"Invalid request."},400);
  const action=String(body.action||""),preview=isPreview(student),db=getServiceSupabase();

  if(action==="start"){
   if(preview)return json({ok:true,preview:true,stage:"listening"});
   const row=await ensureAttempt(student.id);return json({ok:true,stage:row.stage});
  }
  if(action==="save_listening"){
   if(preview)return json({ok:true,preview:true});
   const row=await ensureAttempt(student.id);if(row.stage!=="listening")return json({detail:"Listening is already submitted."},409);
   const answers=sanitizeListening(src.listening.payload,body.answers);
   const {error}=await db.from("ark60_mock_attempts").update({listening_answers:answers,listening_elapsed_seconds:Math.max(0,Number(body.elapsed_seconds)||0),updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;
   return json({ok:true});
  }
  if(action==="submit_listening"){
   const answers=sanitizeListening(src.listening.payload,body.answers),graded=gradeListening(src.listening.payload,answers);
   if(preview)return json({ok:true,preview:true,stage:"reading",reading_remaining:3600,hidden_result:graded});
   const row=await ensureAttempt(student.id);if(row.stage!=="listening")return json({detail:"Listening is already submitted."},409);
   const now=new Date().toISOString();
   const {error}=await db.from("ark60_mock_attempts").update({stage:"reading",listening_answers:answers,listening_score:graded.score,listening_band:graded.band,listening_part_scores:graded.part_scores,listening_elapsed_seconds:Math.max(0,Number(body.elapsed_seconds)||0),listening_submitted_at:now,reading_started_at:now,updated_at:now}).eq("id",row.id);if(error)throw error;
   return json({ok:true,stage:"reading",reading_remaining:3600});
  }
  if(action==="save_reading"){
   if(preview)return json({ok:true,preview:true});
   const row=await ensureAttempt(student.id);if(row.stage!=="reading")return json({detail:"Reading is not active."},409);
   const answers=sanitizeReading(body.answers);
   const elapsed=Math.max(0,3600-remaining(row.reading_started_at,3600));
   const {error}=await db.from("ark60_mock_attempts").update({reading_answers:answers,reading_elapsed_seconds:elapsed,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;
   return json({ok:true});
  }
  if(action==="submit_reading"){
   const answers=sanitizeReading(body.answers),graded=gradeReading(src.reading,answers);
   if(preview)return json({ok:true,preview:true,stage:"writing",writing_remaining:3600,hidden_result:graded});
   const row=await ensureAttempt(student.id);if(row.stage!=="reading")return json({detail:"Reading is not active."},409);
   const now=new Date().toISOString(),elapsed=Math.max(0,3600-remaining(row.reading_started_at,3600));
   const {error}=await db.from("ark60_mock_attempts").update({stage:"writing",reading_answers:answers,reading_score:graded.score,reading_band:graded.band,reading_part_scores:graded.part_scores,reading_elapsed_seconds:elapsed,reading_submitted_at:now,writing_started_at:now,updated_at:now}).eq("id",row.id);if(error)throw error;
   return json({ok:true,stage:"writing",writing_remaining:3600});
  }
  if(action==="save_writing"){
   if(preview)return json({ok:true,preview:true});
   const row=await ensureAttempt(student.id);if(row.stage!=="writing")return json({detail:"Writing is not active."},409);
   const task1=String(body.task1||"").slice(0,25000),task2=String(body.task2||"").slice(0,25000);
   const elapsed=Math.max(0,3600-remaining(row.writing_started_at,3600));
   const {error}=await db.from("ark60_mock_attempts").update({writing_task1:task1,writing_task2:task2,writing_elapsed_seconds:elapsed,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw error;
   return json({ok:true});
  }
  if(action==="submit_writing"){
   const task1=String(body.task1||"").trim().slice(0,25000),task2=String(body.task2||"").trim().slice(0,25000);
   if(!task1||!task2)return json({detail:"Complete both Writing tasks before submitting."},400);
   const assessed=await gradeWriting(task1,task2,src.writing.payload);
   if(preview){
    if(!assessed.ok)return json({ok:false,preview:true,grading_unavailable:true,detail:assessed.error},503);
    const hiddenL=body.preview_listening||{},hiddenR=body.preview_reading||{};
    const result={listening:hiddenL,reading:hiddenR,writing:{band:assessed.band,assessment:assessed.assessment},overall:overall3(Number(hiddenL.band||0),Number(hiddenR.band||0),Number(assessed.band||0))};
    return json({ok:true,preview:true,stage:"completed",result});
   }
   const row=await ensureAttempt(student.id);if(row.stage!=="writing")return json({detail:"Writing is not active."},409);
   const now=new Date().toISOString(),elapsed=Math.max(0,3600-remaining(row.writing_started_at,3600));
   if(!assessed.ok){
    await db.from("ark60_mock_attempts").update({stage:"assessing",status:"assessing",writing_task1:task1,writing_task2:task2,writing_elapsed_seconds:elapsed,writing_submitted_at:now,grading_error:assessed.error,updated_at:now}).eq("id",row.id);
    return json({ok:true,stage:"assessing",detail:"Writing submitted. AI assessment is waiting for configuration."},202);
   }
   const saved=await db.from("ark60_mock_attempts").update({writing_task1:task1,writing_task2:task2,writing_elapsed_seconds:elapsed,writing_submitted_at:now,updated_at:now}).eq("id",row.id).select("*").single();
   if(saved.error)throw saved.error;
   const completed=await completeWriting(saved.data,assessed,src);
   return json({ok:true,stage:"completed",result:stateForClient(completed,false).result});
  }
  return json({detail:"Unknown Full Mock action."},400);
 }catch(e){console.error("mock POST",e);return json({detail:"Could not update Full Mock."},500)}
}
