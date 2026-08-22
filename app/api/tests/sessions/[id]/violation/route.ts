import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data: row, error: readError } = await supabase
      .from('test_sessions')
      .select('id,violation_count,status')
      .eq('id', id)
      .eq('student_id', student.studentId)
      .maybeSingle();

    if (readError) throw readError;
    if (!row || row.status !== 'in_progress') {
      return NextResponse.json({ error: 'Faol test session topilmadi.' }, { status: 404 });
    }

    const count = Math.min(999, Math.max(0, Number(row.violation_count) || 0) + 1);
    const lockedUntil = new Date(Date.now() + 10_000).toISOString();
    const { error: updateError } = await supabase
      .from('test_sessions')
      .update({ violation_count: count, last_violation_at: new Date().toISOString(), locked_until: lockedUntil, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('student_id', student.studentId)
      .eq('status', 'in_progress');

    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, count, lockedUntil });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Ogohlantirish saqlanmadi.' }, { status: 500 });
  }
}
