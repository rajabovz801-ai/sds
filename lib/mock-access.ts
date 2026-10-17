import 'server-only';
import {getServiceSupabase} from '@/lib/supabase/server';
import {isPreview,type Student} from '@/lib/ark60-content-auth';
import {decideMockEntry,requiresPersonalMockCode} from '@/lib/mock-access-policy';
export async function mockEntryForStudent(day:number,student:Student){
 if(!requiresPersonalMockCode(day)||isPreview(student))return decideMockEntry({day,studentId:student.id,preview:isPreview(student),now:Date.now(),grant:null});
 const {data,error}=await getServiceSupabase().from('ark60_mock_entry_codes').select('student_id,day_number,redeemed_at,revoked_at').eq('student_id',student.id).eq('day_number',day).is('revoked_at',null).maybeSingle();
 if(error)throw error;
 return decideMockEntry({day,studentId:student.id,preview:false,now:Date.now(),grant:data});
}
