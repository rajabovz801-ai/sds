import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('test_sessions')
      .update({ last_seen_at: now, updated_at: now })
      .eq('id', id)
      .eq('student_id', student.studentId)
      .eq('status', 'in_progress')
      .gt('expires_at', now)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false }, { status: 409 });

    return NextResponse.json({ ok: true, lastSeenAt: now }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Heartbeat server error',
    }, { status: 500 });
  }
}
