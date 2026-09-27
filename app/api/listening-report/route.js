import { createHash } from "node:crypto";
import { telegram } from "../../../ark-writing-bot/lib/telegram.js";
import { getServiceSupabase } from "../../../lib/supabase/server";

export const runtime="nodejs";
export const maxDuration=60;
const CODE="LISTENING-WATERTOWN-VARROA-AAR", TABLE="teddy_listening_test_reports";
const HEAD={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type","cache-control":"no-store"};
const KEY={1:"weight",2:"back",3:"beginners",4:"mat",5:"jumps",6:"competition",7:"snack",8:"work",9:"heart",10:"reception",11:"C",12:"E",13:"B",14:"D",15:"G",16:"B",17:"H",18:"D",19:"F",20:"E",21:"B",22:"C",23:"D",24:"A",25:"G",26:"E",27:"C",28:"F",29:"B",30:"D",31:"army",32:"safety",33:"learning",34:"reasons",35:"trust",36:"writing",37:"open",38:"leaders",39:"training",40:"time"};
const norm=x=>String(x??"").normalize("NFKC").trim().toLowerCase().replace(/[’\u2019'-]/g,"").replace(/\s+/g," ");
const clean=(x,n)=>String(x??"").replace(/[\r\n\t\u0000-\u001f<>]/g," ").replace(/\s+/g," ").trim().slice(0,n);
const err=(msg,status=400)=>Response.json({ok:false,error:msg},{status,headers:HEAD});
function grade(a){
 const correct={};for(let q=1;q<=40;q++)correct[q]=norm(a[q])===norm(KEY[q]);
 for(const [i,j,keys] of [[11,12,["C","E"]],[13,14,["B","D"]]]){
  const values=[a[i],a[j]].map(norm).filter(Boolean), unique=new Set(values);
  if(values.length!==unique.size)throw Error("Duplicate pair selections");
  const matches=keys.filter(x=>unique.has(norm(x))).length;
  correct[i]=matches>=1;correct[j]=matches===2;
 }
 const parts=[0,1,2,3].map(i=>Array.from({length:10},(_,j)=>Number(correct[i*10+j+1])).reduce((s,n)=>s+n,0));
 const score=parts.reduce((s,n)=>s+n,0);
 const band=score>=39?9:score>=37?8.5:score>=35?8:score>=32?7.5:score>=30?7:score>=26?6.5:score>=23?6:score>=18?5.5:score>=16?5:score>=13?4.5:score>=10?4:score>=6?3.5:score>=4?3:score>=3?2.5:score>=1?2:0;
 return{parts,score,band};
}
export function OPTIONS(){return new Response(null,{status:204,headers:HEAD});}
export function GET(){return Response.json({ok:true,service:"teddy-listening",test_code:CODE,configured:Boolean(process.env.TELEGRAM_BOT_TOKEN&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))},{headers:HEAD});}
export async function POST(request){
 try{
  if(Number(request.headers.get("content-length")||0)>15000)return err("Request too large",413);
  const payload=await request.json().catch(()=>null);
  if(!payload||payload.test_code!==CODE)return err("Unknown test");
  const name=clean(payload.student_name,80), studentId=clean(payload.student_id,48), submissionId=String(payload.submission_id||"");
  if(name.length<3||!studentId)return err("Ism va Student ID kerak");
  if(!/^[0-9a-f-]{20,60}$/i.test(submissionId))return err("Invalid submission ID");
  if(!payload.answers||typeof payload.answers!=="object"||Array.isArray(payload.answers))return err("Answers missing");
  const answers={};
  for(let q=1;q<=40;q++){
   const value=payload.answers[q];
   if(value!=null&&(typeof value!=="string"||value.length>90))return err("Invalid answer "+q);
   answers[q]=String(value??"").trim();
  }
  const result=grade(answers);
  const ip=String(request.headers.get("x-forwarded-for")||"anonymous").split(",")[0].trim();
  const hash=createHash("sha256").update(ip+"|"+new Date().toISOString().slice(0,10)).digest("hex");
  const db=getServiceSupabase();
  const utc=new Date();utc.setUTCHours(0,0,0,0);
  const count=await db.from(TABLE).select("id",{count:"exact",head:true}).eq("source_hash",hash).gte("created_at",utc.toISOString());
  if(count.error)throw count.error;
  if(count.count>=100)return err("Too many submissions from this network",429);
  const insert={submission_id:submissionId,test_code:CODE,student_name:name,student_id:studentId,answers,part_scores:result.parts,score:result.score,band:result.band,source_hash:hash,delivery_status:"pending"};
  let {data:stored,error:insertError}=await db.from(TABLE).insert(insert).select("id,student_id,score,part_scores,band,delivery_status,created_at").single();
  if(insertError?.code==="23505"){
   const existing=await db.from(TABLE).select("id,student_id,score,part_scores,band,delivery_status,created_at").eq("submission_id",submissionId).maybeSingle();
   if(existing.error)throw existing.error;
   stored=existing.data;
   if(!stored||stored.student_id!==studentId)return err("Submission ID already used",409);
   if(stored.delivery_status==="sent")return Response.json({ok:true,duplicate:true,parts:stored.part_scores,score:stored.score,band:stored.band},{headers:HEAD});
   if(stored.delivery_status==="pending"&&Date.now()-new Date(stored.created_at).getTime()<30000)return err("Previous request is processing. Retry shortly.",409);
   const claim=await db.from(TABLE).update({delivery_status:"pending",updated_at:new Date().toISOString()}).eq("id",stored.id);
   if(claim.error)throw claim.error;
  }else if(insertError)throw insertError;
  const target=await db.from("teddy_bot_targets").select("chat_id").eq("title","ARK AI STAFF").eq("enabled",true).maybeSingle();
  if(target.error)throw target.error;
  if(!target.data?.chat_id)throw Error("ARK AI STAFF chat not configured");
  const time=new Intl.DateTimeFormat("uz-UZ",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  const text=["🎧 IELTS LISTENING · NATIJA","👤 "+name+" · ID: "+studentId,"📌 1️⃣ "+result.parts[0]+"/10  2️⃣ "+result.parts[1]+"/10  3️⃣ "+result.parts[2]+"/10  4️⃣ "+result.parts[3]+"/10","🏆 "+result.score+"/40 · Band "+result.band.toFixed(1),"🕐 "+time].join("\n");
  let telegramMessage;
  try{telegramMessage=await telegram("sendMessage",{chat_id:target.data.chat_id,text,disable_web_page_preview:true});}
  catch(sendError){await db.from(TABLE).update({delivery_status:"failed",updated_at:new Date().toISOString()}).eq("id",stored.id);throw sendError;}
  const update=await db.from(TABLE).update({delivery_status:"sent",telegram_message_id:telegramMessage.message_id,updated_at:new Date().toISOString()}).eq("id",stored.id);
  if(update.error)console.error("Report delivered but audit update failed",update.error);
  return Response.json({ok:true,...result},{headers:HEAD});
 }catch(e){console.error("Teddy listening submission error",e);return err("Botga yuborilmadi. Qayta urinib ko‘ring.",503);}
}