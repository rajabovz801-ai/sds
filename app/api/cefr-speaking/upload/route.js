import {allowedOrigin,response,preflight,sessionFor,db,destination,telegram,wavToMp3,TASKS,BUCKET} from "@/lib/cefr-speaking-web";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function OPTIONS(req){return preflight(req)}
export async function POST(req){try{
 if(!allowedOrigin(req))return response(req,{error:"Invalid origin"},403);
 const length=Number(req.headers.get("content-length")||0);if(length>12*1024*1024)return response(req,{error:"Recording exceeds size limit"},413);
 const f=await req.formData();const s=await sessionFor(String(f.get("sessionId")||""),String(f.get("sessionToken")||""));if(!s)return response(req,{error:"Session expired. Please contact the examiner."},401);
 const index=Number(f.get("questionIndex")),audio=f.get("audio");if(!Number.isInteger(index)||index<0||index>=TASKS.length)return response(req,{error:"Invalid question"},400);
 if(!(audio instanceof File)||audio.size<512||audio.size>11*1024*1024)return response(req,{error:"Invalid audio file size"},400);
 const [part,num,question,seconds]=TASKS[index],duration=Math.round(Number(f.get("durationSeconds")||seconds));
 if(duration<1||duration>seconds+10)return response(req,{error:"Invalid audio duration"},400);
 const sb=db(),existing=await sb.from("cefr_speaking_web_answers").select("id,status,storage_path,updated_at").eq("session_id",s.id).eq("question_index",index).maybeSingle();if(existing.error)throw existing.error;
 if(existing.data?.status==="sent")return response(req,{ok:true,alreadySent:true});
 if(existing.data?.status==="pending" && Date.now()-Date.parse(existing.data.updated_at)<65000)return response(req,{error:"This answer is being delivered. Please retry shortly."},409);
 let audioBuf,mime,ext;const incomingMime=(audio.type||"").split(";")[0].toLowerCase();
 if(incomingMime==="audio/wav"||incomingMime==="audio/wave"||incomingMime==="audio/x-wav"){audioBuf=await wavToMp3(await audio.arrayBuffer());mime="audio/mpeg";ext="mp3";}
 else if(incomingMime==="audio/mp4"){audioBuf=Buffer.from(await audio.arrayBuffer());mime="audio/mp4";ext="m4a";}
 else if(incomingMime==="audio/mpeg"){audioBuf=Buffer.from(await audio.arrayBuffer());mime="audio/mpeg";ext="mp3";}
 else if(incomingMime==="audio/ogg"){audioBuf=Buffer.from(await audio.arrayBuffer());mime="audio/ogg";ext="ogg";}
 else return response(req,{error:"Unsupported recording. Use the latest Chrome or Edge."},415);
 const path="web-mock/"+s.id+"/q"+(index+1)+"."+ext;
 const upload=await sb.storage.from(BUCKET).upload(path,audioBuf,{contentType:mime,upsert:true,cacheControl:"0"});if(upload.error)throw upload.error;
 if(!existing.data){const result=await sb.from("cefr_speaking_web_answers").insert({session_id:s.id,question_index:index,storage_path:path,mime_type:mime,duration_seconds:duration,status:"pending"}).select("id").single();if(result.error){if(result.error.code==="23505")return response(req,{error:"Upload already underway"},409);throw result.error}}
 else {const result=await sb.from("cefr_speaking_web_answers").update({status:"pending",storage_path:path,mime_type:mime,duration_seconds:duration,updated_at:new Date().toISOString(),last_error:null}).eq("id",existing.data.id);if(result.error)throw result.error}
 const chatId=await destination();const caption="🎙 CEFR SPEAKING MOCK\n👤 "+s.candidate_name+"\n📋 Part "+part+" · Question "+num+" / 7\n⏱ "+duration+" seconds\n❓ "+question;
 const tf=new FormData();tf.set("chat_id",String(chatId));tf.set("caption",caption.slice(0,1024));tf.set("duration",String(duration));tf.set("voice",new Blob([audioBuf],{type:mime}),"CEFR_"+part.replace(".","-")+"_Q"+num+"."+ext);
 try{const sent=await telegram("sendVoice",tf);const update=await sb.from("cefr_speaking_web_answers").update({status:"sent",telegram_message_id:sent?.message_id||null,updated_at:new Date().toISOString()}).eq("session_id",s.id).eq("question_index",index);if(update.error)throw update.error;return response(req,{ok:true,messageId:sent?.message_id||null});}
 catch(e){await sb.from("cefr_speaking_web_answers").update({status:"failed",last_error:String(e?.message||"delivery failed").slice(0,250),updated_at:new Date().toISOString()}).eq("session_id",s.id).eq("question_index",index);throw e}
 }catch(e){console.error("CEFR upload error",e);return response(req,{error:"Voice delivery failed. The answer is saved; please retry."},502)}}
