import { createHash } from "node:crypto";
import { telegram } from "../../../ark-writing-bot/lib/telegram.js";
import { getServiceSupabase } from "../../../lib/supabase/server";
import { gradeReading, validateReadingConfig } from "../../../lib/teddy-reading-grader.mjs";

export const runtime="nodejs";
export const maxDuration=60;
const CONFIG_TABLE="teddy_reading_test_configs", REPORT_TABLE="teddy_reading_test_reports";
const HEAD={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type","cache-control":"no-store"};
const clean=(value,max)=>String(value??"").replace(/[\r\n\t\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const fail=(message,status=400)=>Response.json({ok:false,error:message},{status,headers:HEAD});

function reportText(config, studentName, studentId, result) {
 const time=new Intl.DateTimeFormat("uz-UZ",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
 const emojis=["1️⃣","2️⃣","3️⃣"];
 return [
  "🏛 ARK Education | English",
  "📖 IELTS READING · NATIJA",
  "",
  "👤 "+studentName,
  "🆔 ID: "+studentId,
  "📘 "+clean(config.test_title,100),
  "",
  "📊 PASSAGE NATIJALARI",
  ...result.passages.map((p,i)=>emojis[i]+" "+p.label+" — "+p.correct+"/"+p.total),
  "",
  "🏆 Overall — "+result.score+"/"+result.total,
  ...(result.band===null?[]:["⭐ Academic Band — "+result.band.toFixed(1)+" (taxminiy)"]),
  "",
  "🕒 "+time
 ].join("\n");
}

export function OPTIONS(){return new Response(null,{status:204,headers:HEAD});}
export async function GET(request){
 const code=new URL(request.url).searchParams.get("test_code");
 if(!code)return Response.json({ok:true,service:"teddy-reading",configured:Boolean(process.env.TELEGRAM_BOT_TOKEN&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)),test_setup:"awaiting-reading-html-and-answer-key"},{headers:HEAD});
 if(!/^[A-Z0-9_-]{3,72}$/.test(code))return fail("Invalid test code");
 try{
  const db=getServiceSupabase();
  const {data,error}=await db.from(CONFIG_TABLE).select("test_code,test_title,question_count,passage_ranges,published").eq("test_code",code).maybeSingle();
  if(error)throw error;
  if(!data||!data.published)return fail("Reading test has not been configured yet",404);
  return Response.json({ok:true,test_code:data.test_code,test_title:data.test_title,question_count:data.question_count,passages:data.passage_ranges},{headers:HEAD});
 }catch(e){console.error("Reading config status error",e);return fail("Reading service temporarily unavailable",503);}
}
export async function POST(request){
 try{
  if(Number(request.headers.get("content-length")||0)>18000)return fail("Request too large",413);
  const payload=await request.json().catch(()=>null);
  if(!payload||typeof payload!=="object")return fail("Invalid submission");
  const code=String(payload.test_code??"");
  if(!/^[A-Z0-9_-]{3,72}$/.test(code))return fail("Invalid test code");
  const name=clean(payload.student_name,80), studentId=clean(payload.student_id,48);
  const submissionId=String(payload.submission_id??"");
  if(name.length<3||!studentId)return fail("Ism familiya va Student ID kiriting");
  if(!/^[0-9a-f-]{20,60}$/i.test(submissionId))return fail("Invalid submission ID");
  if(!payload.answers||typeof payload.answers!=="object"||Array.isArray(payload.answers))return fail("Reading answers missing");
  const db=getServiceSupabase();
  const {data:config,error:configError}=await db.from(CONFIG_TABLE).select("*").eq("test_code",code).eq("published",true).maybeSingle();
  if(configError)throw configError;
  if(!config)return fail("Test answers have not been registered yet",404);
  const validated=validateReadingConfig(config);
  const answers={};
  for(const key of Object.keys(payload.answers))if(!/^\d+$/.test(key)||Number(key)<1||Number(key)>validated.question_count)return fail("Unexpected question number");
  for(let q=1;q<=validated.question_count;q++){
   const value=payload.answers[q];
   if(value!=null&&(typeof value!=="string"||value.length>120))return fail("Invalid answer for question "+q);
   answers[q]=String(value??"").trim();
  }
  const result=gradeReading(config,answers);
  const dateUTC=new Date().toISOString().slice(0,10);
  const sourceIP=String(request.headers.get("x-forwarded-for")||"anonymous").split(",")[0].trim();
  const sourceHash=createHash("sha256").update(sourceIP+"|"+dateUTC).digest("hex");
  const startUTC=new Date(dateUTC+"T00:00:00Z").toISOString();
  const count=await db.from(REPORT_TABLE).select("id",{count:"exact",head:true}).eq("source_hash",sourceHash).gte("created_at",startUTC);
  if(count.error)throw count.error;
  if(count.count>=60)return fail("Too many test submissions from this network",429);
  const insert={
   submission_id:submissionId,test_code:code,student_name:name,student_id:studentId,
   answers,passage_scores:result.passages,score:result.score,question_count:result.total,
   band:result.band,source_hash:sourceHash,delivery_status:"pending"
  };
  let {data:stored,error:insertError}=await db.from(REPORT_TABLE).insert(insert).select("id,student_id,test_code,score,question_count,passage_scores,band,delivery_status,created_at,updated_at").single();
  if(insertError?.code==="23505"){
   const existing=await db.from(REPORT_TABLE).select("id,student_id,test_code,score,question_count,passage_scores,band,delivery_status,created_at,updated_at").eq("submission_id",submissionId).maybeSingle();
   if(existing.error)throw existing.error;
   stored=existing.data;
   if(!stored||stored.student_id!==studentId||stored.test_code!==code)return fail("Submission ID already used",409);
   if(stored.delivery_status==="sent")return Response.json({ok:true,duplicate:true,score:stored.score,total:stored.question_count,passages:stored.passage_scores,band:stored.band},{headers:HEAD});
   if(stored.delivery_status==="pending"&&Date.now()-new Date(stored.updated_at).getTime()<30000)return fail("Previous request is processing. Retry shortly.",409);
   const claim=await db.from(REPORT_TABLE).update({delivery_status:"pending",updated_at:new Date().toISOString()}).eq("id",stored.id).eq("updated_at",stored.updated_at).select("id").maybeSingle();
   if(claim.error)throw claim.error;
   if(!claim.data)return fail("Previous request is processing. Retry shortly.",409);
  }else if(insertError)throw insertError;
  const target=await db.from("teddy_bot_targets").select("chat_id").eq("title","ARK AI STAFF").eq("enabled",true).maybeSingle();
  if(target.error)throw target.error;
  if(!target.data?.chat_id)throw Error("ARK AI STAFF Telegram target not configured");
  let sent;
  try {
   sent=await telegram("sendMessage",{chat_id:target.data.chat_id,text:reportText(config,name,studentId,result),disable_web_page_preview:true});
  }catch(sendError){
   await db.from(REPORT_TABLE).update({delivery_status:"failed",updated_at:new Date().toISOString()}).eq("id",stored.id);
   throw sendError;
  }
  const save=await db.from(REPORT_TABLE).update({delivery_status:"sent",telegram_message_id:sent.message_id,updated_at:new Date().toISOString()}).eq("id",stored.id);
  if(save.error)console.error("Reading report reached Telegram, audit update failed",save.error);
  return Response.json({ok:true,...result},{headers:HEAD});
 }catch(e){console.error("Teddy Reading result submission failed",e);return fail("Reading natijasi yuborilmadi. Qayta urinib ko‘ring.",503);}
}
