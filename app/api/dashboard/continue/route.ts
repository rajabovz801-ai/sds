import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('test_sessions')
      .select('id,test_id,started_at,expires_at,updated_at,tests(id,title,skill,track)')
      .eq('student_id', student.studentId)
      .eq('mode', 'practice')
      .eq('status', 'in_progress')
      .eq('superseded', false)
      .gt('expires_at', now)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: true, active: null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const relation = Array.isArray(data.tests) ? data.tests[0] : data.tests;
    const remainingSeconds = Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
    return NextResponse.json({
      ok: true,
      active: {
        sessionId: data.id,
        testId: data.test_id,
        title: relation?.title || 'Active Practice',
        skill: relation?.skill || 'practice',
        track: relation?.track || 'ielts',
        startedAt: data.started_at,
        expiresAt: data.expires_at,
        remainingSeconds,
        href: `/test/${data.test_id}`,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[DASHBOARD_CONTINUE_ERROR]', error);
    return NextResponse.json({ ok: false, error: 'continue_lookup_failed' }, { status: 500 });
  }
}
