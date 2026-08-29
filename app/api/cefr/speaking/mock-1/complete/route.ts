import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { CEFR_SPEAKING_AUDIO_BUCKET } from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await readActiveStudentSession(request);
    if (!session) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const body = await request.json();
    const recordingId = String(body?.recordingId || '').trim();
    if (!recordingId) return NextResponse.json({ error: 'Recording ID topilmadi.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: recording, error } = await supabase
      .from('cefr_speaking_recordings')
      .select('id,audio_path,status')
      .eq('id', recordingId)
      .eq('student_id', session.studentId)
      .maybeSingle();
    if (error) throw error;
    if (!recording) return NextResponse.json({ error: 'Recording topilmadi.' }, { status: 404 });

    const { data: objects, error: listError } = await supabase.storage
      .from(CEFR_SPEAKING_AUDIO_BUCKET)
      .list(recording.audio_path.split('/').slice(0, -1).join('/'), {
        search: recording.audio_path.split('/').pop(),
        limit: 10,
      });
    if (listError) throw listError;
    if (!objects?.some((item) => item.name === recording.audio_path.split('/').pop())) {
      return NextResponse.json({ error: 'Audio storage’da topilmadi.' }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from('cefr_speaking_recordings')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', recordingId)
      .eq('student_id', session.studentId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, recordingId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Recording yakunlanmadi.' }, { status: 500 });
  }
}
