import {NextRequest,NextResponse} from "next/server";
import {getAdmin,getStudent,isDayUnlocked,isOwnOrigin,isPreview} from "@/lib/ark60-content-auth";
import {getServiceSupabase} from "@/lib/supabase/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

const BUCKET="ark60-speaking-audio";
const SPEAKING_DAYS=new Set([1,2,3]);
const MAX_AUDIO_BYTES=8*1024*1024;
const ALLOWED_MIME=new Set(["audio/webm","audio/mp4","audio/ogg"]);
type AnyRow=Record<string,any>;

function json(data:any,status=200){return NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}})}
function validDay(raw:any){const n=Number(raw);return Number.isInteger(n)&&SPEAKING_DAYS.has(n)?n:null}
function pad(n:number){return String(n).padStart(2,"0")}
function safeExt(mime:string){return mime==="audio/mp4"?"m4a":mime==="audio/ogg"?"ogg":"webm"}
function contentQuestionList(payload:any){
 const out:{key:string;part:number;text:string}[]=[];
 for(const q of payload?.part1?.questions||[])out.push({key:String(q.key),part:1,text:String(q.text)});
 const p2=payload?.part2;
 if(p2?.key){
  const bullets=(p2.bullets||[]).map((x:any)=>"- "+String(x)).join("\n");
  out.push({key:String(p2.key),part:2,text:String(p2.prompt)+(bullets?"\n\nYou should say:\n"+bullets:"")});
 }
 for(const q of payload?.part3?.questions||[])out.push({key:String(q.key),part:3,text:String(q.text)});
 return out;
}
async function getContent(day:number){
 const supabase=getServiceSupabase();
 const {data,error}=await supabase.from("ark60_content").select("id,day_number,module,title,status,payload,published_at").eq("day_number",day).eq("module","speaking").eq("status","published").maybeSingle();
 if(error)throw error;
 return data;
}
async function getAttempt(studentId:string,day:number){
 const supabase=getServiceSupabase();
 const {data,error}=await supabase.from("ark60_speaking_attempts")
  .select("id,student_id,day_number,status,part2_preparation_started_at,part2_preparation_expires_at,submitted_at,expires_at,review_status,band,feedback,reviewed_at,audio_expired,answer_count,total_audio_seconds,created_at,updated_at")
  .eq("student_id",studentId).eq("day_number",day).maybeSingle();
 if(error)throw error;return data;
}
async function getAnswers(attemptId:string){
 const supabase=getServiceSupabase();
 const {data,error}=await supabase.from("ark60_speaking_answers")
  .select("id,attempt_id,day_number,part_number,question_key,question_text,mime_type,duration_seconds,created_at,expires_at")
  .eq("attempt_id",attemptId).order("part_number",{ascending:true}).order("created_at",{ascending:true});
 if(error)throw error;return data||[];
}
function publicAttempt(attempt:any,answers:any[]=[]){
 if(!attempt)return null;
 return {
  id:attempt.id,day_number:attempt.day_number,status:attempt.status,
  part2_preparation_started_at:attempt.part2_preparation_started_at,
  part2_preparation_expires_at:attempt.part2_preparation_expires_at,
  submitted_at:attempt.submitted_at,expires_at:attempt.expires_at,
  review_status:attempt.review_status,band:attempt.band,feedback:attempt.feedback,
  reviewed_at:attempt.reviewed_at,audio_expired:attempt.audio_expired,
  answer_count:attempt.answer_count,total_audio_seconds:attempt.total_audio_seconds,
  answers:answers.map(a=>({...a,audio_url:"/api/challenge-speaking?action=audio&id="+encodeURIComponent(a.id)}))
 };
}

export async function GET(req:NextRequest){
 try{
  const url=new URL(req.url);
  const action=url.searchParams.get("action")||"day";
  const supabase=getServiceSupabase();

  if(action==="availability"){
   const day=validDay(url.searchParams.get("day"));
   if(!day)return json({published:false},200);
   const content=await getContent(day);
   const student=await getStudent(req);
   return json({published:!!content,title:content?.title||"",preview:!!(student&&isPreview(student))});
  }

  if(action==="audio"){
   const answerId=String(url.searchParams.get("id")||"");
   if(!answerId)return json({detail:"Audio answer is required."},400);
   const [student,admin]=await Promise.all([getStudent(req),getAdmin(req)]);
   if(!student&&!admin)return json({detail:"Sign in required."},401);
   const {data:answer,error}=await supabase.from("ark60_speaking_answers")
    .select("id,student_id,storage_path,expires_at,attempt_id").eq("id",answerId).maybeSingle();
   if(error||!answer)return json({detail:"Audio is no longer available."},404);
   if(student&&answer.student_id!==student.id&&!admin)return json({detail:"Not allowed."},403);
   const {data:attempt}=await supabase.from("ark60_speaking_attempts").select("audio_expired,expires_at").eq("id",answer.attempt_id).maybeSingle();
   if(attempt?.audio_expired||(attempt?.expires_at&&Date.parse(attempt.expires_at)<=Date.now()))return json({detail:"Audio expired."},410);
   const {data:signed,error:signError}=await supabase.storage.from(BUCKET).createSignedUrl(answer.storage_path,120);
   if(signError||!signed?.signedUrl)return json({detail:"Audio is unavailable."},404);
   return NextResponse.redirect(signed.signedUrl,307);
  }

  if(action==="admin_list"){
   const admin=await getAdmin(req);if(!admin)return json({detail:"Admin sign-in required."},401);
   const {data,error}=await supabase.from("ark60_speaking_attempts")
    .select("id,student_id,day_number,status,submitted_at,expires_at,review_status,band,feedback,reviewed_at,audio_expired,answer_count,total_audio_seconds")
    .eq("status","submitted").order("submitted_at",{ascending:false}).limit(300);
   if(error)return json({detail:"Could not load Speaking submissions."},500);
   const rows=data||[];const ids=[...new Set(rows.map(x=>x.student_id))];
   let students:any[]=[];
   if(ids.length){const result=await supabase.from("ark60_students").select("id,first_name,last_name,username").in("id",ids);students=result.data||[]}
   const map=new Map(students.map(s=>[s.id,s]));
   return json({admin,submissions:rows.map(r=>({...r,student:map.get(r.student_id)||null}))});
  }

  if(action==="admin_detail"){
   const admin=await getAdmin(req);if(!admin)return json({detail:"Admin sign-in required."},401);
   const id=String(url.searchParams.get("id")||"");if(!id)return json({detail:"Submission id required."},400);
   const {data:attempt,error}=await supabase.from("ark60_speaking_attempts")
    .select("id,student_id,day_number,status,submitted_at,expires_at,review_status,band,feedback,reviewed_at,audio_expired,answer_count,total_audio_seconds")
    .eq("id",id).eq("status","submitted").maybeSingle();
   if(error||!attempt)return json({detail:"Speaking submission not found."},404);
   const [{data:student},content,answers]=await Promise.all([
    supabase.from("ark60_students").select("id,first_name,last_name,username").eq("id",attempt.student_id).maybeSingle(),
    getContent(attempt.day_number),
    attempt.audio_expired?Promise.resolve([]):getAnswers(attempt.id)
   ]);
   return json({admin,submission:{...attempt,student:student||null,content,answers:answers.map(a=>({...a,audio_url:"/api/challenge-speaking?action=audio&id="+encodeURIComponent(a.id)}))}});
  }

  if(action==="notifications"){
   const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
   const {data,error}=await supabase.from("ark60_speaking_attempts")
    .select("id,day_number,submitted_at,review_status,band,feedback,reviewed_at,audio_expired")
    .eq("student_id",student.id).eq("status","submitted").eq("review_status","reviewed")
    .order("reviewed_at",{ascending:false}).limit(100);
   if(error)return json({detail:"Could not load Speaking results."},500);
   return json({notifications:data||[]});
  }

  const student=await getStudent(req);
  if(!student)return json({detail:"Please sign in."},401);
  const day=validDay(url.searchParams.get("day"));
  if(!day)return json({detail:"Speaking is available only on Day 1, Day 2 and Day 3."},404);
  if(!(await isDayUnlocked(day,student)))return json({detail:"This Speaking task is not available yet."},403);
  const content=await getContent(day);if(!content)return json({detail:"Speaking material has not been published yet."},404);
  if(isPreview(student))return json({content,attempt:null,preview:true});
  const attempt=await getAttempt(student.id,day);
  const answers=attempt&&!attempt.audio_expired?await getAnswers(attempt.id):[];
  return json({content,attempt:publicAttempt(attempt,answers),preview:false});
 }catch(e){console.error("Speaking GET",e);return json({detail:"Could not load Speaking."},500)}
}

export async function POST(req:NextRequest){
 try{
  if(!isOwnOrigin(req))return json({detail:"Invalid request origin."},403);
  const declared=Number(req.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>MAX_AUDIO_BYTES+1024*128)return json({detail:"Request is too large."},413);
  const contentType=req.headers.get("content-type")||"";
  const supabase=getServiceSupabase();

  if(contentType.includes("multipart/form-data")){
   const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
   const form=await req.formData();
   const action=String(form.get("action")||"");
   if(action!=="upload")return json({detail:"Unknown upload action."},400);
   const day=validDay(form.get("day"));if(!day)return json({detail:"Invalid Speaking day."},400);
   if(!(await isDayUnlocked(day,student)))return json({detail:"This Speaking task is not available yet."},403);
   const content=await getContent(day);if(!content)return json({detail:"Speaking material has not been published yet."},404);
   const attemptId=String(form.get("attempt_id")||"");
   const questionKey=String(form.get("question_key")||"");
   const duration=Math.floor(Number(form.get("duration_seconds")||0));
   const audio=form.get("audio");
   if(!(audio instanceof File)||audio.size<100)return json({detail:"A valid audio recording is required."},400);
   if(audio.size>MAX_AUDIO_BYTES)return json({detail:"Recording is too large."},413);
   if(!Number.isInteger(duration)||duration<1||duration>180)return json({detail:"Invalid recording duration."},400);
   const canonical=contentQuestionList(content.payload).find(q=>q.key===questionKey);
   if(!canonical)return json({detail:"Invalid Speaking question."},400);
   const mime=(audio.type||"").split(";")[0].toLowerCase();
   if(!ALLOWED_MIME.has(mime))return json({detail:"Unsupported audio format."},415);

   if(isPreview(student)){
    return json({ok:true,preview:true,answer:{id:"preview-"+questionKey,part_number:canonical.part,question_key:questionKey,question_text:canonical.text,mime_type:mime,duration_seconds:duration,created_at:new Date().toISOString(),audio_url:null}});
   }

   const {data:attempt,error:attemptError}=await supabase.from("ark60_speaking_attempts")
    .select("id,student_id,day_number,status,part2_preparation_expires_at").eq("id",attemptId).eq("student_id",student.id).eq("day_number",day).maybeSingle();
   if(attemptError||!attempt)return json({detail:"Speaking attempt not found."},404);
   if(attempt.status!=="in_progress")return json({detail:"This Speaking attempt has already been submitted."},409);
   if(canonical.part===2){
    if(!attempt.part2_preparation_expires_at)return json({detail:"Start the Part 2 preparation first."},409);
    if(Date.parse(attempt.part2_preparation_expires_at)>Date.now())return json({detail:"Part 2 preparation is still running."},409);
   }
   const {data:existing}=await supabase.from("ark60_speaking_answers").select("id").eq("attempt_id",attempt.id).eq("question_key",questionKey).maybeSingle();
   if(existing)return json({detail:"This answer has already been saved."},409);

   const ext=safeExt(mime);
   const path=`${student.id}/day-${pad(day)}/${attempt.id}/part-${canonical.part}/${questionKey}-${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,audio,{contentType:mime,upsert:false,cacheControl:"0"});
   if(uploadError){console.error("Speaking upload",uploadError);return json({detail:"Could not upload the recording. Try again."},500)}
   const {data:saved,error:saveError}=await supabase.from("ark60_speaking_answers").insert({
    attempt_id:attempt.id,student_id:student.id,day_number:day,part_number:canonical.part,
    question_key:questionKey,question_text:canonical.text,storage_path:path,mime_type:mime,duration_seconds:duration
   }).select("id,attempt_id,day_number,part_number,question_key,question_text,mime_type,duration_seconds,created_at").maybeSingle();
   if(saveError||!saved){
    await supabase.storage.from(BUCKET).remove([path]);
    if(String(saveError?.code)==="23505")return json({detail:"This answer has already been saved."},409);
    return json({detail:"Could not save the recording."},500);
   }
   return json({ok:true,answer:{...saved,audio_url:"/api/challenge-speaking?action=audio&id="+encodeURIComponent(saved.id)}});
  }

  const body=await req.json().catch(()=>null);
  if(!body||typeof body!=="object")return json({detail:"Invalid request body."},400);
  const action=String((body as AnyRow).action||"");

  if(action==="grade"){
   const admin=await getAdmin(req);if(!admin)return json({detail:"Admin sign-in required."},401);
   const id=String((body as AnyRow).id||"");
   const band=Number((body as AnyRow).band);
   const feedback=String((body as AnyRow).feedback||"").trim().slice(0,4000);
   if(!id||!Number.isFinite(band)||band<0||band>9||Math.round(band*2)!==band*2)return json({detail:"Choose a valid IELTS band score in 0.5 steps."},400);
   const reviewedAt=new Date().toISOString();
   const {data:attempt,error}=await supabase.from("ark60_speaking_attempts")
    .update({band,feedback:feedback||null,review_status:"reviewed",reviewed_at:reviewedAt,updated_at:reviewedAt})
    .eq("id",id).eq("status","submitted").select("id,student_id,day_number,band,feedback,review_status,reviewed_at,audio_expired").maybeSingle();
   if(error||!attempt)return json({detail:"Could not save the Speaking review."},500);
   await supabase.from("ark60_submissions").update({band,review_status:"reviewed",review_feedback:feedback||null,reviewed_at:reviewedAt})
    .eq("student_id",attempt.student_id).eq("day_number",attempt.day_number).eq("module","speaking");
   return json({ok:true,submission:attempt});
  }

  const student=await getStudent(req);if(!student)return json({detail:"Please sign in."},401);
  const day=validDay((body as AnyRow).day);if(!day)return json({detail:"Speaking is available only on Day 1, Day 2 and Day 3."},400);
  if(!(await isDayUnlocked(day,student)))return json({detail:"This Speaking task is not available yet."},403);
  const content=await getContent(day);if(!content)return json({detail:"Speaking material has not been published yet."},404);

  if(action==="start"){
   if(isPreview(student))return json({ok:true,preview:true,attempt:{id:"preview-speaking-"+day,day_number:day,status:"in_progress",answers:[]}});
   let attempt=await getAttempt(student.id,day);
   if(attempt?.status==="submitted")return json({ok:true,already_submitted:true,attempt:publicAttempt(attempt,[])});
   if(!attempt){
    const {data,error}=await supabase.from("ark60_speaking_attempts").insert({student_id:student.id,day_number:day}).select("*").maybeSingle();
    if(error||!data)return json({detail:"Could not start Speaking."},500);
    attempt=data;
   }
   const activeAttempt=attempt;
   if(!activeAttempt)return json({detail:"Could not start Speaking."},500);
   return json({ok:true,attempt:publicAttempt(activeAttempt,await getAnswers(activeAttempt.id))});
  }

  if(action==="start_preparation"){
   if(isPreview(student)){
    const started=new Date(),expires=new Date(started.getTime()+60000);
    return json({ok:true,preview:true,started_at:started.toISOString(),expires_at:expires.toISOString()});
   }
   const attemptId=String((body as AnyRow).attempt_id||"");
   const current=await getAttempt(student.id,day);
   if(!current||current.id!==attemptId)return json({detail:"Speaking attempt not found."},404);
   if(current.status!=="in_progress")return json({detail:"This Speaking attempt has already been submitted."},409);
   if(current.part2_preparation_started_at)return json({ok:true,already_started:true,started_at:current.part2_preparation_started_at,expires_at:current.part2_preparation_expires_at});
   const started=new Date(),expires=new Date(started.getTime()+60000);
   const {data,error}=await supabase.from("ark60_speaking_attempts")
    .update({part2_preparation_started_at:started.toISOString(),part2_preparation_expires_at:expires.toISOString(),updated_at:started.toISOString()})
    .eq("id",attemptId).eq("student_id",student.id).is("part2_preparation_started_at",null)
    .select("part2_preparation_started_at,part2_preparation_expires_at").maybeSingle();
   if(error)return json({detail:"Could not start preparation."},500);
   if(data)return json({ok:true,started_at:data.part2_preparation_started_at,expires_at:data.part2_preparation_expires_at});
   const again=await getAttempt(student.id,day);
   return json({ok:true,already_started:true,started_at:again?.part2_preparation_started_at,expires_at:again?.part2_preparation_expires_at});
  }

  if(action==="submit"){
   const expected=contentQuestionList(content.payload).map(q=>q.key);
   if(isPreview(student))return json({ok:true,preview:true,submission:{id:"preview-speaking-"+day,submitted_at:new Date().toISOString(),review_status:"preview",answer_count:expected.length}});
   const attemptId=String((body as AnyRow).attempt_id||"");
   const {data,error}=await supabase.rpc("ark60_submit_speaking_attempt",{p_attempt:attemptId,p_student:student.id,p_day:day,p_expected_keys:expected});
   if(error){
    const msg=String(error.message||"");
    if(/Complete every Speaking answer/i.test(msg))return json({detail:"Complete every Speaking answer before submitting."},409);
    console.error("Speaking submit",error);return json({detail:"Could not submit Full Speaking."},500);
   }
   return json({ok:true,submission:data});
  }

  return json({detail:"Unknown action."},400);
 }catch(e){console.error("Speaking POST",e);return json({detail:"Could not process Speaking."},500)}
}
