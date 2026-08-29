import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const section = String(body?.section || '').toLowerCase();
    if (!['listening', 'reading'].includes(section)) {
      return NextResponse.json({ error: 'Video section noto‘g‘ri.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,status')
      .eq('id', id)
      .eq('student_id', student.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });
    if (attempt.status !== 'in_progress') return NextResponse.json({ error: 'Mock attempt yakunlangan.' }, { status: 409 });

    const [{ data: progress, error: progressError }, { data: results, error: resultsError }] = await Promise.all([
      supabase.from('mock_attempt_progress').select('stage,listening_video_seen_at,reading_video_seen_at').eq('attempt_id', id).maybeSingle(),
      supabase.from('section_results').select('section').eq('attempt_id', id),
    ]);
    if (progressError) throw progressError;
    if (resultsError) throw resultsError;

    const sections = new Set((results || []).map((row) => row.section));
    const now = new Date().toISOString();

    if (section === 'listening') {
      if (sections.has('listening')) return NextResponse.json({ ok: true, stage: 'reading_video', alreadyDone: true });
      const { error } = await supabase.from('mock_attempt_progress').upsert({
        attempt_id: id,
        stage: 'listening_test',
        listening_video_seen_at: progress?.listening_video_seen_at || now,
        reading_video_seen_at: progress?.reading_video_seen_at || null,
        updated_at: now,
      }, { onConflict: 'attempt_id' });
      if (error) throw error;
      return NextResponse.json({ ok: true, stage: 'listening_test' });
    }

    if (!sections.has('listening')) {
      return NextResponse.json({ error: 'Avval Listening testni yakunlang.' }, { status: 409 });
    }
    if (sections.has('reading')) return NextResponse.json({ ok: true, stage: 'completed', alreadyDone: true });

    const { error } = await supabase.from('mock_attempt_progress').upsert({
      attempt_id: id,
      stage: 'reading_test',
      listening_video_seen_at: progress?.listening_video_seen_at || now,
      reading_video_seen_at: progress?.reading_video_seen_at || now,
      updated_at: now,
    }, { onConflict: 'attempt_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true, stage: 'reading_test' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock progress server error' }, { status: 500 });
  }
}
