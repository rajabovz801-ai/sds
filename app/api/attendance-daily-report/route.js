import {timingSafeEqual} from 'node:crypto';
import {getServiceSupabase} from '../../../lib/supabase/server';
import {deliverAttendanceAtSixPM} from '../../../ark-writing-bot/lib/attendance-admin.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const TEDDY_PROJECT='prj_LZ7iM9e956Nsj91z2zeI87TgKO7e';
async function isAuthorized(request){
  const cronSecret=process.env.CRON_SECRET;
  if(cronSecret && request.headers.get('authorization')==='Bearer '+cronSecret)return true;
  const received=request.headers.get('x-ark-attendance-cron')||'';
  if(!/^[a-f0-9]{64}$/i.test(received))return false;
  const db=getServiceSupabase();
  const {data,error}=await db.from('sa_cron_settings').select('bearer_token')
    .eq('singleton',true).maybeSingle();
  if(error)throw error;
  const expected=data?.bearer_token||'';
  const left=Buffer.from(received,'ascii'),right=Buffer.from(expected,'ascii');
  return left.length===right.length && timingSafeEqual(left,right);
}
export async function GET(request){
  if(process.env.VERCEL_PROJECT_ID!==TEDDY_PROJECT)
    return Response.json({ok:true,skipped:'not_teddy_project'});
  try{
    if(!(await isAuthorized(request)))
      return Response.json({ok:false,error:'unauthorized'},{status:401});
    const outcome=await deliverAttendanceAtSixPM();
    return Response.json({ok:!outcome.failed?.length,...outcome},
      {status:outcome.failed?.length?503:200,headers:{'cache-control':'no-store'}});
  }catch(e){
    console.error('Attendance 18:00 cron failed',e);
    return Response.json({ok:false,error:'internal_error'},{status:500});
  }
}