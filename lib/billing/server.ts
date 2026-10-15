import 'server-only';
import {getServiceSupabase} from '@/lib/supabase/server';
export async function hasCompletedResult(studentId:string,day:number,module:string){
 if(!Number.isInteger(day)||day<1||day>60)return false;
 const db=getServiceSupabase();
 if(module==='reading'){const r=await db.from('ark60_reading_attempts').select('passage_id').eq('student_id',studentId).eq('day_number',day).limit(1);if(r.error)throw r.error;return !!r.data?.length;}
 if(module==='listening'||module==='speaking'){const r=await db.from('ark60_'+module+'_attempts').select('id').eq('student_id',studentId).eq('day_number',day).eq('status','submitted').limit(1);if(r.error)throw r.error;return !!r.data?.length;}
 if(module==='mock'){const r=await db.from('ark60_mock_attempts').select('id').eq('student_id',studentId).eq('day_number',day).in('stage',['completed','assessing']).limit(1);if(r.error)throw r.error;return !!r.data?.length;}
 if(module==='vocabulary'){
  const u=await db.from('ark60_vocab_units').select('id').eq('day_number',day);if(u.error)throw u.error;if(!u.data?.length)return false;
  const r=await db.from('ark60_vocab_attempts').select('id').eq('student_id',studentId).in('unit_id',u.data.map(x=>x.id)).eq('status','completed').limit(1);if(r.error)throw r.error;return !!r.data?.length;
 }
 if(module!=='writing')return false;
 const r=await db.from('ark60_submissions').select('id').eq('student_id',studentId).eq('day_number',day).eq('module',module).limit(1);if(r.error)throw r.error;return !!r.data?.length;
}
