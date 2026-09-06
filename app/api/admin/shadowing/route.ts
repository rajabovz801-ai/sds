import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { mapShadowingLesson, SHADOWING_VIDEO_BUCKET } from '@/lib/shadowing';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SELECT = 'id,sequence_no,title,script,video_path,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,created_at,updated_at';

function deny(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('shadowing_lessons')
      .select(SELECT)
      .order('sequence_no', { ascending: true })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ lessons: (data || []).map((row) => mapShadowingLesson(row as never)) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shadowing mashqlari yuklanmadi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    const script = typeof body?.script === 'string' ? body.script.trim().slice(0, 30000) : '';
    const videoPath = typeof body?.videoPath === 'string' ? body.videoPath.trim().slice(0, 500) : '';
    const status = body?.status === 'draft' ? 'draft' : 'published';

    if (!title) return NextResponse.json({ error: 'Shadowing nomi yoki speaker nomini kiriting.' }, { status: 400 });
    if (script.length < 10) return NextResponse.json({ error: 'Shadowing scriptini kiriting.' }, { status: 400 });
    if (!videoPath.startsWith('shadowing/')) return NextResponse.json({ error: 'Shadowing video yuklanmagan.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: latest, error: latestError } = await supabase
      .from('shadowing_lessons')
      .select('sequence_no')
      .order('sequence_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const sequenceNo = Math.max(1, Number(latest?.sequence_no || 0) + 1);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('shadowing_lessons')
      .insert({ sequence_no: sequenceNo, title, script, video_path: videoPath, status, updated_at: now })
      .select(SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json({ lesson: mapShadowingLesson(data as never) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shadowing saqlanmadi.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const status = body?.status === 'draft' ? 'draft' : body?.status === 'published' ? 'published' : '';
    if (!id || !status) return NextResponse.json({ error: 'Shadowing ma’lumotlari noto‘g‘ri.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('shadowing_lessons')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Shadowing topilmadi.' }, { status: 404 });

    return NextResponse.json({ lesson: mapShadowingLesson(data as never) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shadowing holati o‘zgarmadi.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'Shadowing ID topilmadi.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: current, error: currentError } = await supabase
      .from('shadowing_lessons')
      .select('id,title,video_path')
      .eq('id', id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Shadowing topilmadi.' }, { status: 404 });

    const { error } = await supabase.from('shadowing_lessons').delete().eq('id', id);
    if (error) throw error;
    if (current.video_path) {
      const { error: storageError } = await supabase.storage.from(SHADOWING_VIDEO_BUCKET).remove([String(current.video_path)]);
      if (storageError) console.error('Shadowing video cleanup failed', storageError);
    }

    return NextResponse.json({ deleted: true, lesson: { id: current.id, title: current.title } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shadowing o‘chirilmadi.' }, { status: 500 });
  }
}
