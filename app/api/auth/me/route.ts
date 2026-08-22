import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ student: null });

    const sessionAge = session.iat ? Math.floor(Date.now() / 1000) - session.iat : Number.POSITIVE_INFINITY;
    if (session.firstName && sessionAge < 10 * 60) {
      return NextResponse.json({
        student: {
          id: session.studentId,
          telegramId: session.telegramId,
          firstName: session.firstName,
          lastName: session.lastName || '',
        },
      }, { headers: { 'Cache-Control': 'private, max-age=30' } });
    }

    const supabase = getServiceSupabase();
    const { data: student, error } = await supabase
      .from('students')
      .select('id,telegram_id,telegram_username,first_name,last_name,status')
      .eq('id', session.studentId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!student) return NextResponse.json({ student: null });

    return NextResponse.json({
      student: {
        id: student.id,
        telegramId: Number(student.telegram_id),
        username: student.telegram_username,
        firstName: student.first_name,
        lastName: student.last_name,
      },
    });
  } catch (error) {
    return NextResponse.json({ student: null, error: error instanceof Error ? error.message : 'Session error' }, { status: 500 });
  }
}
