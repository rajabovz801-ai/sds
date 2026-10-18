import {allowedOrigin,response,preflight,db,digest,newToken,shortName,cleanIp,destination} from "@/lib/cefr-speaking-web";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function OPTIONS(req){return preflight(req)}
export async function GET(req){return response(req,{ok:true,service:"CEFR Speaking recording",configured:!!process.env.TELEGRAM_BOT_TOKEN})}
export async function POST(req){try{
 if(!allowedOrigin(req))return response(req,{error:"Invalid origin"},403);
 const body=await req.json().catch(()=>({}));const name=shortName(body?.studentName);
 if(name.length<3||name.length>80)return response(req,{error:"Please enter your full name."},400);
 if(!process.env.TELEGRAM_BOT_TOKEN)return response(req,{error:"Teddy bot has not been configured"},503);
 await destination();
 const ip=cleanIp(req),since=new Date(Date.now()-10*60*1000).toISOString();
 const {count,error:limitError}=await db().from("cefr_speaking_web_sessions").select("id",{head:true,count:"exact"}).eq("ip_hash",ip).gte("created_at",since);
 if(limitError)throw limitError;if((count||0)>=60)return response(req,{error:"Too many exams started. Please try again later."},429);
 const token=newToken();const {data,error}=await db().from("cefr_speaking_web_sessions").insert({candidate_name:name,token_hash:digest(token),ip_hash:ip}).select("id,expires_at").single();if(error)throw error;
 return response(req,{ok:true,sessionId:data.id,sessionToken:token,expiresAt:data.expires_at});
 }catch(e){console.error("CEFR start error",e);return response(req,{error:"The exam server is temporarily unavailable."},503)}}
