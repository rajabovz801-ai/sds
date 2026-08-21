import { NextResponse } from 'next/server';
import { getPublicSupabase, getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const publicDb=getPublicSupabase();
    const {data:test,error}=await publicDb.from('tests').select('id,title,track,skill,status,file_name,file_path').eq('id',id).eq('status','published').single();
    if(error||!test) return NextResponse.json({error:'Test not found'},{status:404});
    const service=getServiceSupabase();
    const {data:signed,error:signError}=await service.storage.from(HTML_TESTS_BUCKET).createSignedUrl(test.file_path,60*60);
    if(signError||!signed?.signedUrl) throw signError||new Error('Signed URL yaratilmadi');
    return NextResponse.json({test:{id:test.id,title:test.title,track:test.track,skill:test.skill,fileName:test.file_name},url:signed.signedUrl});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});}
}
