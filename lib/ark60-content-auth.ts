import "server-only";
import {createHash} from "node:crypto";
import type {NextRequest} from "next/server";

export type Student={id:string;username:string;first_name:string;last_name:string;status:string};
export type Admin={id:string;username:string;display_name:string;role:string;status:string};
export type Row=Record<string,any>;

const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://svdigxqdivcmljirjwhk.supabase.co").replace(/\/$/,"");
const KEY=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"";
export const VALID_DAYS=new Set([1,2,5,6,8,9,12,13,15,16]);
export const isUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function sqlTable(table:string,method="GET",query="",body?:unknown,prefer=""){
 if(!KEY)throw Error("Server database key missing");
 if(!/^(ark60_[a-z_]+|rpc\/ark60_vocab_submit_answer)$/.test(table))throw Error("Unknown table");
 const resp=await fetch(BASE+"/rest/v1/"+table+(query?"?"+query:""),{
   method,cache:"no-store",headers:{
    apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",
    ...(prefer?{Prefer:prefer}:{})
   },...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!resp.ok){const message=(await resp.text()).slice(0,230);console.error("ARK database",resp.status,message);throw Error("Database request failed ("+resp.status+")")}
 const raw=await resp.text();return raw?JSON.parse(raw):[];
}
const sha=(s:string)=>createHash("sha256").update(s).digest("hex");
export async function getStudent(req:NextRequest):Promise<Student|null>{
 const token=req.cookies.get("ark60_session")?.value;if(!token)return null;
 const sessions=await sqlTable("ark60_sessions","GET","select=student_id,expires_at,revoked_at&token_hash=eq."+sha(token)+"&limit=1");
 const sess=sessions[0];if(!sess||sess.revoked_at||Date.parse(sess.expires_at)<=Date.now())return null;
 const rows=await sqlTable("ark60_students","GET","select=id,username,first_name,last_name,status&id=eq."+sess.student_id+"&limit=1");
 return rows[0]?.status==="active"?rows[0]:null;
}
export async function getAdmin(req:NextRequest):Promise<Admin|null>{
 const token=req.cookies.get("ark60_admin")?.value;if(!token)return null;
 const sessions=await sqlTable("ark60_admin_sessions","GET","select=admin_id,expires_at,revoked_at&token_hash=eq."+sha(token)+"&limit=1");
 const sess=sessions[0];if(!sess||sess.revoked_at||Date.parse(sess.expires_at)<=Date.now())return null;
 const rows=await sqlTable("ark60_admins","GET","select=id,username,display_name,role,status&id=eq."+sess.admin_id+"&limit=1");
 return rows[0]?.status==="active"?rows[0]:null;
}
export const isPreview=(s:Student)=>s.username.toLowerCase()==="rustam7";
export function todayInTashkent(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export function isDayOpen(n:number,user:Student){
 if(!Number.isInteger(n)||n<1||n>60)return false;
 const iso=new Date(Date.UTC(2026,9,n)).toISOString().slice(0,10);
 return isPreview(user)||iso<=todayInTashkent();
}
export function isOwnOrigin(req:NextRequest){
 const origin=req.headers.get("origin");return !origin||origin===new URL(req.url).origin;
}
