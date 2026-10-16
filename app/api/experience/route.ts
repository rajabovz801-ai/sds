import {NextRequest,NextResponse} from 'next/server';
import {getStudent} from '@/lib/ark60-content-auth';
import {getServiceSupabase} from '@/lib/supabase/server';
import {catalog,ownerExperienceAllowed} from '@/lib/experience/core';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const send=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const actions=new Set(['buy','equip','clear','motion','refill','reset','task','review','quest','claim_quest']);
async function handle(req:NextRequest,write:boolean){
 try{
  const student=await getStudent(req);
  if(!student)return send({error:'Kirish talab qilinadi.'},401);
  if(!ownerExperienceAllowed(student))return send({enabled:false,error:'Soon — Shop tez orada ochiladi.'},403);
  let action='snapshot',data:Record<string,unknown>={};
  if(write){
   if(req.headers.get('sec-fetch-site')==='cross-site'||(req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin))return send({error:'So‘rov manbasi noto‘g‘ri.'},403);
   const text=await req.text();if(text.length>2048)return send({error:'So‘rov juda katta.'},413);
   let body;try{body=JSON.parse(text)}catch{return send({error:'So‘rov noto‘g‘ri.'},400)}
   if(!body||typeof body!=='object'||!actions.has(body.action))return send({error:'Amal topilmadi.'},400);
   action=body.action;data=body.data||{};
   if(typeof data!=='object'||Array.isArray(data))return send({error:'Ma’lumot noto‘g‘ri.'},400);
  }
  const {data:state,error}=await getServiceSupabase().rpc('ark60_experience_action',{p_student:student.id,p_action:action,p_data:data});
  if(error){
   const errors:Record<string,string>={EXPERIENCE_INSUFFICIENT_COINS:'Tanga yetarli emas. Sinov balansini tiklashingiz mumkin.',EXPERIENCE_NOT_OWNED:'Avval ushbu buyumni oling.',EXPERIENCE_QUEST_INCOMPLETE:'Avval 6 ta sinov qadamini yakunlang.'};
   const key=Object.keys(errors).find(k=>error.message.includes(k));
   if(key)return send({error:errors[key]},409);
   if(error.message.includes('EXPERIENCE_'))return send({error:'Bu amal uchun ma’lumot noto‘g‘ri.'},400);
   console.error('experience database',error.code);return send({error:'Sinov muhiti vaqtincha mavjud emas.'},503);
  }
  return send({enabled:true,mode:'sandbox',catalog,state});
 }catch{return send({error:'Sinov muhiti yuklanmadi. Qayta urinib ko‘ring.'},503)}
}
export async function GET(req:NextRequest){return handle(req,false)}
export async function POST(req:NextRequest){return handle(req,true)}
