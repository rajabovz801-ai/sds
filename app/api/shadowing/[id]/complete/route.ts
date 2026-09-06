import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data: lesson, error: lessonError } = await supabase
      .from('shadowing_lessons')
      .select('id,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at')
      .eq('id', id)
      .maybeSingle();
    if (lessonError) throw lessonError;
    if (!lesson || lesson.status !== 'published') return NextResponse.json({ error: 'Shadowing topilmadi.' }, { status: 404 });

    const now = new Date();
    const nowMs = now.getTime();
    const startedAt = lesson.daily_task_started_at ? new Date(lesson.daily_task_started_at).getTime() : 0;
    const expiresAt = lesson.daily_task_expires_at ? new Date(lesson.daily_task_expires_at).getTime() : 0;
    if (!lesson.daily_task_enabled || startedAt <= 0 || nowMs < startedAt || expiresAt <= nowMs) {
      return NextResponse.json({ error: 'Bu Shadowing hozir Daily Task emas.' }, { status: 409 });
    }

    const points = Math.max(0, Math.min(100, Math.round(Number(lesson.daily_task_points) || 20)));
    const { data, error } = await supabase
      .from('shadowing_daily_task_completions')
      .upsert({
        student_id: student.studentId,
        shadowing_id: id,
        points_awarded: points,
        completed_at: now.toISOString(),
      }, { onConflict: 'student_id,shadowing_id', ignoreDuplicates: true })
      .select('id,points_awarded')
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      alreadyCompleted: !data,
      pointsAwarded: data ? Number(data.points_awarded) || points : 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Shadowing Daily Task server xatosi.' }, { status: 500 });
  }
}
