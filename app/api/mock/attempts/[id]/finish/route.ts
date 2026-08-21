import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: 'Avval platformaga kiring.' }, { status: 401 });

    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,student_id,mock_id,status,overall_score,overall_band,completed_at')
      .eq('id', id)
      .eq('student_id', session.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt || !attempt.mock_id) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });

    if (attempt.status === 'completed') {
      return NextResponse.json({
        ok: true,
        alreadyCompleted: true,
        attempt: {
          id: attempt.id,
          status: attempt.status,
          overallScore: attempt.overall_score,
          overallBand: attempt.overall_band,
          completedAt: attempt.completed_at,
        },
      });
    }

    const { data: mock, error: mockError } = await supabase
      .from('mocks')
      .select('id,title,reading_test_id,listening_test_id,writing_test_id,speaking_test_id')
      .eq('id', attempt.mock_id)
      .maybeSingle();
    if (mockError) throw mockError;
    if (!mock) return NextResponse.json({ error: 'Mock topilmadi.' }, { status: 404 });

    const requiredSections = [
      ['reading', mock.reading_test_id],
      ['listening', mock.listening_test_id],
      ['writing', mock.writing_test_id],
      ['speaking', mock.speaking_test_id],
    ].filter(([, testId]) => Boolean(testId)).map(([section]) => section as string);

    if (!requiredSections.length) return NextResponse.json({ error: 'Mock ichida sectionlar yo‘q.' }, { status: 409 });

    const { data: results, error: resultError } = await supabase
      .from('section_results')
      .select('section,raw_score,max_score,band,details')
      .eq('attempt_id', attempt.id)
      .in('section', requiredSections);
    if (resultError) throw resultError;

    const bySection = new Map((results || []).map((item) => [item.section, item]));
    const missing = requiredSections.filter((section) => !bySection.has(section));
    if (missing.length) {
      return NextResponse.json({ error: `Avval ${missing.join(', ')} sectionlarini yakunlang.`, missing }, { status: 409 });
    }

    const percentages = (results || [])
      .filter((item) => item.raw_score != null && item.max_score != null && Number(item.max_score) > 0)
      .map((item) => (Number(item.raw_score) / Number(item.max_score)) * 100);
    const bands = (results || []).filter((item) => item.band != null).map((item) => Number(item.band));

    const overallScore = percentages.length
      ? Number((percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2))
      : null;
    const overallBand = bands.length ? roundHalf(bands.reduce((sum, value) => sum + value, 0) / bands.length) : null;
    const completedAt = new Date().toISOString();

    const { data: completed, error: updateError } = await supabase
      .from('attempts')
      .update({ status: 'completed', completed_at: completedAt, overall_score: overallScore, overall_band: overallBand })
      .eq('id', attempt.id)
      .eq('status', 'in_progress')
      .select('id,status,overall_score,overall_band,completed_at')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!completed) return NextResponse.json({ error: 'Mock holati o‘zgargan. Sahifani yangilang.' }, { status: 409 });

    let queued = 0;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('telegram_id')
        .eq('id', session.studentId)
        .maybeSingle();
      const { data: admins } = await supabase
        .from('admins')
        .select('telegram_id')
        .eq('active', true);
      const { data: existing } = await supabase
        .from('bot_notifications')
        .select('recipient_type,telegram_id')
        .eq('attempt_id', attempt.id);

      const existingKeys = new Set((existing || []).map((item) => `${item.recipient_type}:${item.telegram_id}`));
      const notifications: Array<{ attempt_id: string; recipient_type: 'student' | 'admin'; telegram_id: number; status: 'pending' }> = [];

      if (student?.telegram_id) {
        const telegramId = Number(student.telegram_id);
        if (!existingKeys.has(`student:${telegramId}`)) notifications.push({ attempt_id: attempt.id, recipient_type: 'student', telegram_id: telegramId, status: 'pending' });
      }

      for (const admin of admins || []) {
        const telegramId = Number(admin.telegram_id);
        if (!existingKeys.has(`admin:${telegramId}`)) notifications.push({ attempt_id: attempt.id, recipient_type: 'admin', telegram_id: telegramId, status: 'pending' });
      }

      if (notifications.length) {
        const { error: notificationError } = await supabase.from('bot_notifications').insert(notifications);
        if (!notificationError) queued = notifications.length;
      }
    } catch {
      queued = 0;
    }

    return NextResponse.json({
      ok: true,
      attempt: {
        id: completed.id,
        status: completed.status,
        overallScore: completed.overall_score,
        overallBand: completed.overall_band,
        completedAt: completed.completed_at,
      },
      notificationsQueued: queued,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Finish mock server error' }, { status: 500 });
  }
}
