import { NextResponse } from 'next/server';
import { getPublicSupabase, getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const publicDb=getPublicSupabase();
    const {data:test,error}=await publicDb
      .from('tests')
      .select('id,status,file_path,file_name')
      .eq('id',id)
      .eq('status','published')
      .single();

    if(error||!test) return new NextResponse('Test not found',{status:404});

    const service=getServiceSupabase();
    const {data:file,error:downloadError}=await service.storage.from(HTML_TESTS_BUCKET).download(test.file_path);
    if(downloadError||!file) throw downloadError||new Error('HTML file not found');

    const html=await file.text();
    return new NextResponse(html,{
      status:200,
      headers:{
        'Content-Type':'text/html; charset=utf-8',
        'Content-Disposition':`inline; filename="${String(test.file_name||'test.html').replace(/"/g,'')}"`,
        'Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }catch(error){
    return new NextResponse(error instanceof Error?error.message:'Server error',{status:500});
  }
}
