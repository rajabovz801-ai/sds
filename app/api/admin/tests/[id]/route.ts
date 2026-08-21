import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { checkAdminRequest } from '@/lib/adminAuth';

function authResponse(request:NextRequest){
  const auth=checkAdminRequest(request);
  if(!auth.ok) return NextResponse.json({error:auth.error},{status:auth.status});
  return null;
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const denied=authResponse(request); if(denied) return denied;
  try{
    const {id}=await params;
    const body=await request.json();
    const allowed=['title','description','track','skill','status'] as const;
    const update:Record<string,unknown>={updated_at:new Date().toISOString()};
    for(const key of allowed) if(body[key]!==undefined) update[key]=body[key];
    const supabase=getServiceSupabase();
    const {data,error}=await supabase.from('tests').update(update).eq('id',id).select('*').single();
    if(error) throw error;
    return NextResponse.json({test:data});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const denied=authResponse(request); if(denied) return denied;
  try{
    const {id}=await params;
    const supabase=getServiceSupabase();
    const {data:row,error:readError}=await supabase.from('tests').select('file_path').eq('id',id).single();
    if(readError) throw readError;
    const {error:deleteError}=await supabase.from('tests').delete().eq('id',id);
    if(deleteError) throw deleteError;
    if(row?.file_path) await supabase.storage.from(HTML_TESTS_BUCKET).remove([row.file_path]);
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});}
}
