import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { CEFR_SPEAKING_MOCK_KEY, getCefrSpeakingMock } from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const mock = await getCefrSpeakingMock();
    if (!mock) return NextResponse.json({ error: 'Speaking Mock topilmadi.' }, { status: 404 });

    const supabase = getServiceSupabase();
    const { data: recordings, error } = await supabase
      .from('cefr_speaking_recordings')
      .select('id,student_id,candidate_name,mime_type,size_bytes,duration_seconds,status,started_at,completed_at,created_at')
      .eq('mock_id', mock.id)
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) throw error;

    return NextResponse.json({ mock, recordings: recordings || [] }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Speaking admin server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const action = String(body?.action || '');
    const supabase = getServiceSupabase();
    const mock = await getCefrSpeakingMock();
    if (!mock) return NextResponse.json({ error: 'Speaking Mock topilmadi.' }, { status: 404 });

    if (action === 'setVideo') {
      const videoPath = String(body?.videoPath || '').trim();
      if (!videoPath.startsWith('instructions/cefr-speaking/')) {
        return NextResponse.json({ error: 'Video path noto‘g‘ri.' }, { status: 400 });
      }
      const { error } = await supabase
        .from('cefr_speaking_mocks')
        .update({ instruction_video_path: videoPath, updated_at: new Date().toISOString() })
        .eq('mock_key', CEFR_SPEAKING_MOCK_KEY);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'publish') {
      if (!mock.instruction_video_path) {
        return NextResponse.json({ error: 'Avval instruction video yuklang.' }, { status: 400 });
      }
      const { error } = await supabase
        .from('cefr_speaking_mocks')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('mock_key', CEFR_SPEAKING_MOCK_KEY);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'close') {
      const { error } = await supabase
        .from('cefr_speaking_mocks')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('mock_key', CEFR_SPEAKING_MOCK_KEY);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Action noto‘g‘ri.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Speaking admin update error' }, { status: 500 });
  }
}
