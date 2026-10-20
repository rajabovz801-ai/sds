import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import sharp from 'sharp';
import {getStudent,isOwnOrigin,membershipForStudent} from '@/lib/ark60-content-auth';
import {getServiceSupabase} from '@/lib/supabase/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const send=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const bucket='ark60-profile-photos';
export async function POST(req:NextRequest){
 if(!isOwnOrigin(req)||req.headers.get('sec-fetch-site')==='cross-site')return send({error:'Invalid origin'},403);
 try{
  const student=await getStudent(req);if(!student)return send({error:'Kirish talab qilinadi.'},401);
  const membership=await membershipForStudent(student);
  if(!["rustam7","rustam_usmonov_4f42fb15"].includes(student.username)&&!(membership.challenge_until&&Date.parse(membership.challenge_until)>Date.now()))return send({error:'Rasm yuklash uchun PRO’ga obuna bo‘ling.'},403);
  if(Number(req.headers.get('content-length')||0)>6*1024*1024)return send({error:'Rasm hajmi 5 MB dan kichik bo‘lsin.'},413);
  const form=await req.formData(),file=form.get('photo');
  if(!(file instanceof File)||file.size>5*1024*1024||!file.size)return send({error:'5 MB gacha rasm tanlang.'},400);
  let bytes:Buffer;
  try{
   const input=Buffer.from(await file.arrayBuffer());
   const image=sharp(input,{limitInputPixels:25000000,animated:false});
   const meta=await image.metadata();
   if(!['jpeg','png','webp','heif','avif'].includes(meta.format||''))throw Error('format');
   bytes=await image.rotate().resize(512,512,{fit:'cover'}).webp({quality:85}).toBuffer();
  }catch{return send({error:'JPG, PNG yoki WebP formatidagi rasmni tanlang.'},400)}
  const db=getServiceSupabase(),path=student.id+'/'+randomUUID()+'.webp';
  const uploaded=await db.storage.from(bucket).upload(path,bytes,{contentType:'image/webp',cacheControl:'3600'});
  if(uploaded.error)throw uploaded.error;
  const photo_url=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const old=await db.from('ark60_cosmetics').select('photo_url').eq('student_id',student.id).maybeSingle();
  const saved=await db.from('ark60_cosmetics').upsert({student_id:student.id,photo_url,photo_enabled:true,updated_at:new Date().toISOString()},{onConflict:'student_id'});
  if(saved.error){await db.storage.from(bucket).remove([path]);throw saved.error}
  const prefix=photo_url.slice(0,photo_url.indexOf(student.id+'/'));
  if(old.data?.photo_url?.startsWith(prefix+student.id+'/'))await db.storage.from(bucket).remove([old.data.photo_url.slice(prefix.length)]);
  return send({photo_url});
 }catch{return send({error:'Rasm saqlanmadi. Qaytadan urinib ko‘ring.'},503)}
}
export async function DELETE(req:NextRequest){
 if(!isOwnOrigin(req)||req.headers.get('sec-fetch-site')==='cross-site')return send({error:'Invalid origin'},403);
 try{
  const student=await getStudent(req);if(!student)return send({error:'Kirish talab qilinadi.'},401);
  const db=getServiceSupabase();
  const old=await db.from('ark60_cosmetics').select('photo_url').eq('student_id',student.id).maybeSingle();
  const result=await db.from('ark60_cosmetics').update({photo_url:null,photo_enabled:false}).eq('student_id',student.id);
  if(result.error)throw result.error;
  const prefix=db.storage.from(bucket).getPublicUrl(student.id+'/').data.publicUrl;
  if(old.data?.photo_url?.startsWith(prefix))await db.storage.from(bucket).remove([student.id+'/'+old.data.photo_url.slice(prefix.length)]);
  return send({ok:true});
 }catch{return send({error:'Rasm olib tashlanmadi.'},503)}
}
