import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {getAdmin,getStudent,isOwnOrigin,isUuid} from '@/lib/ark60-content-auth';
import {getServiceSupabase} from '@/lib/supabase/server';
import {requiresPersonalMockCode,personalMockOpensAt} from '@/lib/mock-access-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const send=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const hash=(code:string)=>createHash('sha256').update(code).digest('hex');
export async function GET(req:NextRequest){
 try{
  const admin=await getAdmin(req);
  if(!admin||admin.role!=='super_admin')return send({detail:'Super admin access required.'},403);
  const day=Number(new URL(req.url).searchParams.get('day'));
  if(!requiresPersonalMockCode(day))return send({detail:'This mock does not use personal codes.'},400);
  const db=getServiceSupabase();
  const [people,codes]=await Promise.all([
   db.from('ark60_students').select('id,first_name,last_name,username',{count:'exact'}).eq('status','active').order('first_name').limit(2000),
   db.from('ark60_mock_entry_codes').select('id,student_id,day_number,code_hint,paid_confirmed_at,issued_at,redeemed_at,revoked_at',{count:'exact'}).eq('day_number',day).order('issued_at',{ascending:false}).limit(2000)
  ]);
  if(people.error||codes.error)throw Error('Mock access list unavailable');
  return send({students:people.data,codes:codes.data,opens_at:personalMockOpensAt(day),limited:(people.count||0)>2000||(codes.count||0)>2000});
 }catch{return send({detail:'Could not load mock access.'},503)}
}
export async function POST(req:NextRequest){
 if(!isOwnOrigin(req))return send({detail:'Invalid request origin.'},403);
 try{
  const input=await req.json().catch(()=>null);
  if(!input||typeof input!=='object'||!requiresPersonalMockCode(input.day))return send({detail:'Invalid mock.'},400);
  const db=getServiceSupabase();
  if(input.action==='issue'||input.action==='revoke'){
   const admin=await getAdmin(req);
   if(!admin||admin.role!=='super_admin')return send({detail:'Super admin access required.'},403);
   if(input.action==='issue'){
    if(!isUuid(String(input.student_id||''))||input.payment_confirmed!==true)return send({detail:'Select a student and confirm their payment first.'},400);
    const raw=randomBytes(6).toString('hex').toUpperCase();
    const {data,error}=await db.rpc('ark60_mock_code_issue',{p_admin:admin.id,p_student:input.student_id,p_day:input.day,p_hash:hash(raw),p_hint:raw.slice(-4)});
    if(error)return send({detail:'Could not issue code. Check that the student is active.'},409);
    return send({ok:true,id:data.id,code:raw.match(/.{4}/g)!.join('-')});
   }
   if(!isUuid(String(input.code_id||'')))return send({detail:'Invalid code.'},400);
   const {error}=await db.rpc('ark60_mock_code_revoke',{p_admin:admin.id,p_code:input.code_id});
   return error?send({detail:'Could not revoke code.'},409):send({ok:true});
  }
  if(input.action!=='redeem')return send({detail:'Invalid action.'},400);
  const student=await getStudent(req);
  if(!student)return send({detail:'Please sign in.'},401);
  if(typeof input.code!=='string'||input.code.length>64)return send({detail:'Enter your personal code.'},400);
  const code=input.code.trim().toUpperCase().replace(/[\s-]/g,'');
  const {data,error}=await db.rpc('ark60_mock_code_redeem',{p_student:student.id,p_day:input.day,p_hash:hash(/^[A-F0-9]{12}$/.test(code)?code:'invalid-code')});
  if(error)throw Error('Code validation unavailable');
  if(data.status==='locked')return send({detail:'Ko‘p noto‘g‘ri urinish. 15 daqiqadan keyin qayta urinib ko‘ring.',retry_at:data.retry_at},429);
  if(data.status!=='ok')return send({detail:'Kod noto‘g‘ri, bekor qilingan yoki bu akkauntga tegishli emas.'},403);
  return send({ok:true,opens_at:personalMockOpensAt(input.day)});
 }catch{return send({detail:'Could not verify mock access. Please try again.'},503)}
}
