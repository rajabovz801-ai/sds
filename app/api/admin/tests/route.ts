import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

function authorized(request:NextRequest){
  const expected=process.env.ADMIN_ACCESS_KEY;
  const received=request.headers.get('x-admin-key');
  return Boolean(expected && received && received===expected);
}

export async function GET(request:NextRequest){
  if(!authorized(request)) return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const supabase=getServiceSupabase();
    const {data,error}=await supabase.from('tests').select('*').order('updated_at',{ascending:false});
    if(error) throw error;
    return NextResponse.json({tests:data||[]});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});}
}

export async function POST(request:NextRequest){
  if(!authorized(request)) return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const form=await request.formData();
    const title=String(form.get('title')||'').trim();
    const description=String(form.get('description')||'').trim();
    const track=String(form.get('track')||'');
    const skill=String(form.get('skill')||'');
    const status=String(form.get('status')||'draft');
    const file=form.get('file');
    if(!title||!(file instanceof File)) return NextResponse.json({error:'Title and HTML file are required'},{status:400});
    if(!['ielts','cefr'].includes(track)||!['reading','listening','writing','speaking','full-mock'].includes(skill)||!['draft','published'].includes(status)) return NextResponse.json({error:'Invalid metadata'},{status:400});
    if(!/\.html?$/i.test(file.name)) return NextResponse.json({error:'Only HTML files are allowed'},{status:400});
    const supabase=getServiceSupabase();
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
    const path=`${track}/${skill}/${crypto.randomUUID()}-${safeName}`;
    const bytes=await file.arrayBuffer();
    const {error:uploadError}=await supabase.storage.from(HTML_TESTS_BUCKET).upload(path,bytes,{contentType:'text/html;charset=utf-8',upsert:false});
    if(uploadError) throw uploadError;
    const {data,error}=await supabase.from('tests').insert({title,description,track,skill,status,file_name:file.name,file_path:path}).select('*').single();
    if(error){await supabase.storage.from(HTML_TESTS_BUCKET).remove([path]);throw error;}
    return NextResponse.json({test:data},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error'},{status:500});}
}
