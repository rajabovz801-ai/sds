import "server-only";
import {createHmac,timingSafeEqual,randomBytes} from "node:crypto";
import {getServiceSupabase} from "@/lib/supabase/server";

export const TASKS=[
 ["1.1",1,"What is your favourite book?",30],
 ["1.1",2,"Do you play any instruments?",30],
 ["1.1",3,"What is your dream job?",30],
 ["1.2",1,"Describe what you see in the pictures.",45],
 ["1.2",2,"What are the differences between remote working and working at workplaces?",30],
 ["1.2",3,"Why do many people today want remote working?",30],
 ["2",1,"Discuss a health-related goal you have set for yourself.",120]
];
export const BUCKET="cefr-speaking-audio";
function secret(){const s=process.env.CEFR_SPEAKING_SESSION_SECRET;if(!s)throw Error("CEFR Speaking session key is not configured");return s;}
export function digest(value){return createHmac("sha256",secret()).update(value).digest("hex")}
export function matches(a,b){if(!a||!b||a.length!==b.length)return false;return timingSafeEqual(Buffer.from(a),Buffer.from(b))}
export function newToken(){return randomBytes(36).toString("base64url")}
export function db(){return getServiceSupabase()}
export function allowedOrigin(req){const o=req.headers.get("origin");if(!o||o==="null")return true;try{const x=new URL(o);const host=new URL(req.url);return (x.protocol==="https:"&&x.host===host.host)||(x.hostname==="localhost"||x.hostname==="127.0.0.1");}catch{return false}}
export function headers(req){const origin=req.headers.get("origin");return {"Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Origin":origin==="null"?"null":(origin&&allowedOrigin(req)?origin:"*"),"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}}
export function response(req,data,status=200){return Response.json(data,{status,headers:headers(req)})}
export function preflight(req){return new Response(null,{status:204,headers:headers(req)})}
export function shortName(raw){return String(raw||"").normalize("NFKC").replace(/[\u0000-\u001f<>]/g,"").replace(/\s+/g," ").trim().slice(0,80)}
export function cleanIp(req){const raw=String(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"unknown").split(",")[0].trim();return digest("ip:"+raw)}
export async function sessionFor(id,token){if(!/^[0-9a-f-]{36}$/i.test(String(id||""))||!token)return null;const {data,error}=await db().from("cefr_speaking_web_sessions").select("id,candidate_name,token_hash,expires_at,completed_at").eq("id",id).maybeSingle();if(error||!data||data.completed_at||Date.parse(data.expires_at)<Date.now()||!matches(data.token_hash,digest(token)))return null;return data}
export async function destination(){const {data,error}=await db().from("teddy_bot_targets").select("chat_id,title").eq("title","ARK AI STAFF").eq("enabled",true).limit(1).maybeSingle();if(error||!data)throw Error("ARK AI STAFF bot destination unavailable");return data.chat_id}
export async function telegram(method,form){const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw Error("Teddy bot token not configured");const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),45000);try{const resp=await fetch("https://api.telegram.org/bot"+token+"/"+method,{method:"POST",body:form,signal:ctl.signal});const obj=await resp.json().catch(()=>null);if(!resp.ok||!obj?.ok)throw Error(obj?.description||"Telegram delivery failed");return obj.result}finally{clearTimeout(t)}}
export async function sendSummary(chatId,text){const token=process.env.TELEGRAM_BOT_TOKEN;const f=new FormData();f.set("chat_id",String(chatId));f.set("text",text);return telegram("sendMessage",f)}
export function wavToPcm(bytes){
 const b=Buffer.from(bytes);if(b.length<44||b.toString("ascii",0,4)!=="RIFF"||b.toString("ascii",8,12)!=="WAVE")throw Error("Invalid WAV recording");
 let sampleRate=0,channels=0,bits=0,audioFmt=0,position=12,offset=-1,dataSize=0;
 while(position+8<=b.length){const id=b.toString("ascii",position,position+4),size=b.readUInt32LE(position+4);const begin=position+8;if(begin+size>b.length)throw Error("Invalid WAV chunk");if(id==="fmt "){audioFmt=b.readUInt16LE(begin);channels=b.readUInt16LE(begin+2);sampleRate=b.readUInt32LE(begin+4);bits=b.readUInt16LE(begin+14)}if(id==="data"){offset=begin;dataSize=size;break}position=begin+size+(size%2)}
 if(audioFmt!==1||channels!==1||bits!==16||sampleRate<8000||sampleRate>48000||offset<0||dataSize<512||dataSize>11*1024*1024)throw Error("Unsupported PCM WAV audio");
 const samples=new Int16Array(dataSize/2);for(let i=0;i<samples.length;i++)samples[i]=b.readInt16LE(offset+i*2);return {samples,sampleRate};
}
export async function wavToMp3(bytes){
 const {samples,sampleRate}=wavToPcm(bytes);const mod=await import("@breezystack/lamejs");const Encoder=mod.Mp3Encoder||mod.default?.Mp3Encoder;if(!Encoder)throw Error("MP3 encoder unavailable");
 const encoder=new Encoder(1,sampleRate,48),chunk=1152,out=[];for(let i=0;i<samples.length;i+=chunk){const x=encoder.encodeBuffer(samples.subarray(i,i+chunk));if(x.length)out.push(Buffer.from(x))}const end=encoder.flush();if(end.length)out.push(Buffer.from(end));return Buffer.concat(out)
}
