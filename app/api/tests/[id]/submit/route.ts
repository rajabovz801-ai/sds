import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import { sendAdminTestResult } from '@/lib/telegram-server';

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: unknown) {
  const valueNumber = numberOrNull(value);
  return valueNumber === null ? null : Math.max(0, Math.round(valueNumber));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: 'Avval platformaga kiring.' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const details = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? body.details as Record<string, unknown>
      : {};

    if (JSON.stringify(details).length > 200000) {
      return NextResponse.json({ error: 'Natija tafsilotlari juda katta.' }, { status: 413 });
    }

    const correct = integerOrNull(body?.correct);
    const wrong = integerOrNull(body?.wrong);
    const unanswered = integerOrNull(body?.unanswered);
    const rawScore = numberOrNull(body?.rawScore ?? body?.score);
    const maxScore = numberOrNull(body?.maxScore ?? body?.total);
    const band = numberOrNull(body?.band);
    const durationSeconds = integerOrNull(body?.durationSeconds ?? details.durationSeconds);

    if (rawScore === null || maxScore === null || maxScore <= 0 || rawScore < 0 || rawScore > maxScore) {
      return NextResponse.json({ error: 'Test natijasi noto‘g‘ri.' }, { status: 400 });
    }
    if (band !== null && (band < 0 || band > 9)) {
      return NextResponse.json({ error: 'Band noto‘g‘ri.' }, { status: 400 });
    }
    if (correct !== null && wrong !== null && unanswered !== null && correct + wrong + unanswered !== Math.round(maxScore)) {
      return NextResponse.json({ error: 'Javoblar soni umumiy savollar soniga mos emas.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id,title,track,skill,status')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (testError) throw testError;
    if (!test) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });

    const telegram = await sendAdminTestResult({
      student: {
        firstName: session.firstName,
        lastName: session.lastName,
        telegramId: session.telegramId,
      },
      testTitle: test.title,
      track: test.track,
      section: test.skill,
      rawScore,
      maxScore,
      band,
      correct,
      wrong,
      unanswered,
      durationSeconds,
      submittedAt: typeof body?.submittedAt === 'string' ? body.submittedAt : new Date().toISOString(),
      details,
    });

    if (!telegram.configured || telegram.sent === 0) {
      return NextResponse.json({
        error: telegram.error || 'Natija Telegram admin’ga yuborilmadi.',
        telegram,
      }, { status: 503 });
    }

    return NextResponse.json({ ok: true, telegram });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Natija yuborish server xatosi.' }, { status: 500 });
  }
}
