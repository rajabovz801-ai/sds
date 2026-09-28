import {deliverAttendanceAtSixPM} from '../../../ark-writing-bot/lib/attendance-admin.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const TEDDY_PROJECT='prj_LZ7iM9e956Nsj91z2zeI87TgKO7e';
export async function GET(request){
  if(process.env.VERCEL_PROJECT_ID!==TEDDY_PROJECT)
    return Response.json({ok:true,skipped:'not_teddy_project'});
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get('authorization')!=='Bearer '+secret)
    return Response.json({ok:false,error:'unauthorized'},{status:401});
  try{
    const outcome=await deliverAttendanceAtSixPM();
    return Response.json({ok:!outcome.failed?.length,...outcome},
      {status:outcome.failed?.length?503:200,headers:{'cache-control':'no-store'}});
  }catch(e){
    console.error('Attendance 18:00 cron failed',e);
    return Response.json({ok:false,error:'internal_error'},{status:500});
  }
}