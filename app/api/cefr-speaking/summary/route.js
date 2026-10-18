import {allowedOrigin,response,preflight,sessionFor,db,destination,sendSummary} from "@/lib/cefr-speaking-web";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function OPTIONS(req){return preflight(req)}
export async function POST(req){try{
 if(!allowedOrigin(req))return response(req,{error:"Invalid origin"},403);
 const body=await req.json().catch(()=>({}));const s=await sessionFor(body.sessionId,body.sessionToken);if(!s)return response(req,{error:"Session expired"},401);
 const {data,error}=await db().from("cefr_speaking_web_answers").select("question_index,status").eq("session_id",s.id);if(error)throw error;
 const sent=(data||[]).filter(x=>x.status==="sent").length;
 if(sent!==7)return response(req,{error:"Only "+sent+" of 7 answers delivered",uploaded:sent},409);
 const chatId=await destination();await sendSummary(chatId,"✅ CEFR SPEAKING MOCK — COMPLETED\n👤 "+s.candidate_name+"\n🎤 7/7 recordings delivered\n🆔 "+s.id.slice(0,8));
 const updated=await db().from("cefr_speaking_web_sessions").update({completed_at:new Date().toISOString()}).eq("id",s.id);if(updated.error)throw updated.error;
 return response(req,{ok:true,uploaded:7});
 }catch(e){console.error("CEFR summary error",e);return response(req,{error:"Could not finalize exam"},502)}}
