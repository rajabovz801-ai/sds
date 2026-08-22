import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

type Row = Record<string, any>;

function migrationMessage(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === '42703') {
    return 'Qayta urinish funksiyasi uchun 20260823_admin_retry_grants.sql migrationini ishga tushiring.';
  }
  return value?.message || 'Urinishlar yuklanmadi.';
}

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const [{ data: sessions, error: sessionError }, { data: students, error: studentError }, { data: tests, error: testError }] = await Promise.all([
      supabase
        .from('test_sessions')
        .select('id,student_id,test_id,mock_attempt_id,mode,section,status,started_at,submitted_at,expires_at,superseded')
        .eq('superseded', false)
        .in('status', ['completed', 'expired'])
        .order('started_at', { ascending: false })
        .limit(2000),
      supabase.from('students').select('id,first_name,last_name,telegram_id,status').limit(1000),
      supabase.from('tests').select('id,title,track,skill').limit(1000),
    ]);

    if (sessionError) throw sessionError;
    if (studentError) throw studentError;
    if (testError) throw testError;

    const studentById = new Map((students || []).map((student: Row) => [String(student.id), student]));
    const testById = new Map((tests || []).map((test: Row) => [String(test.id), test]));

    const attempts = (sessions || []).map((session: Row) => {
      const student = studentById.get(String(session.student_id)) || {};
      const test = testById.get(String(session.test_id)) || {};
      return {
        sessionId: String(session.id),
        studentId: String(session.student_id),
        studentName: `${String(student.first_name || '').trim()} ${String(student.last_name || '').trim()}`.trim() || 'O‘quvchi',
        telegramId: student.telegram_id ? String(student.telegram_id) : '',
        studentStatus: String(student.status || 'active'),
        testId: String(session.test_id),
        testTitle: String(test.title || 'Test'),
        track: String(test.track || ''),
        skill: String(session.section || test.skill || ''),
        mode: String(session.mode || 'practice'),
        status: String(session.status),
        finishedAt: session.submitted_at || session.expires_at || session.started_at,
      };
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    return NextResponse.json({ error: migrationMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) return NextResponse.json({ error: 'Test urinishini tanlang.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .select('id,student_id,test_id,mock_attempt_id,mode,section,status,superseded')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ error: 'Urinish topilmadi.' }, { status: 404 });
    if (session.superseded) return NextResponse.json({ ok: true, alreadyReopened: true });
    if (session.status === 'in_progress') {
      return NextResponse.json({ error: 'Faol testni qayta ochib bo‘lmaydi. Avval test yakunlanishi kerak.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: archived, error: archiveError } = await supabase
      .from('test_sessions')
      .update({ superseded: true, updated_at: now })
      .eq('id', session.id)
      .eq('superseded', false)
      .select('id')
      .maybeSingle();
    if (archiveError) throw archiveError;
    if (!archived) return NextResponse.json({ ok: true, alreadyReopened: true });

    if (session.mode === 'mock' && session.mock_attempt_id && session.section) {
      const [{ error: resultDeleteError }, { error: attemptUpdateError }] = await Promise.all([
        supabase
          .from('section_results')
          .delete()
          .eq('attempt_id', session.mock_attempt_id)
          .eq('section', session.section),
        supabase
          .from('attempts')
          .update({ status: 'in_progress', completed_at: null, overall_score: null, overall_band: null })
          .eq('id', session.mock_attempt_id)
          .eq('student_id', session.student_id),
      ]);
      if (resultDeleteError) throw resultDeleteError;
      if (attemptUpdateError) throw attemptUpdateError;
    }

    return NextResponse.json({
      ok: true,
      studentId: session.student_id,
      testId: session.test_id,
      message: 'O‘quvchiga shu testni yana bir marta ishlashga ruxsat berildi.',
    });
  } catch (error) {
    return NextResponse.json({ error: migrationMessage(error) }, { status: 500 });
  }
}
