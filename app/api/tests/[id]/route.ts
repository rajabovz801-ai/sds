import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session';
import { readAdminSession } from '@/lib/auth/admin-session';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    if (!readSession(request) && !readAdminSession(request)) {
      return NextResponse.json({error:'Avval platformaga kiring.'},{status:401});
    }
    const {id}=await params;
    const publicDb=getPublicSupabase();
    const {data:test,error}=await publicDb
      .from('tests')
      .select('id,title,track,skill,status,file_name')
      .eq('id',id)
      .eq('status','published')
      .single();

    if(error||!test) return NextResponse.json({error:'Test not found'},{status:404});

    return NextResponse.json({
      test:{
        id:test.id,
        title:test.title,
        track:test.track,
        skill:test.skill,
        fileName:test.file_name,
      },
      contentUrl:`/api/tests/${test.id}/content`,
    }, {headers:{'Cache-Control':'private, max-age=60'}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});
  }
}
