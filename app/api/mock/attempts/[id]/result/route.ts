import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import { sendAdminTestResult } from '@/lib/telegram-server';

type SectionName = 'reading' | 'listening' | 'writing' | 'speaking';

const sectionFields: Record<SectionName, 'reading_test_id' | 'listening_test_id' | 'writing_test_id' | 'speaking_test_id'> = {
  reading: 'reading_test_id',
  listening: 'listening_test_id',
  writing: 'writing_test_id',
  speaking: 'speaking_test_id',
};

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: unknown) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.max(0, Math.round(parsed));
}

function ieltsBand(section: SectionName, raw: number, max: number) {
  if (max !== 40 || !['reading', 'listening'].includes(section)) return null;
  const table = section === 'listening'
    ? [[39,9],[37,8.5],[35,8],[32,7.5],[30,7],[26,6.5],[23,6],[18,5.5],[16,5],[13,4.5],[11,4],[8,3.5],[6,3],[4,2.5],[0,0]]
    : [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5],[0,0]];
  return table.find(([minimum]) => raw >= minimum)?.[1] ?? null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: 'Avval platformaga kiring.' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const section = String(body?.section || '').toLowerCase() as SectionName;
    if (!Object.prototype.hasOwnProperty.call(sectionFields, section)) {
      return NextResponse.json({ error: 'Section noto‘g‘ri.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,student_id,mock_id,status')
      .eq('id', id)
      .eq('student_id', session.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt || !attempt.mock_id) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });
    if (attempt.status === 'completed') return NextResponse.json({ error: 'Bu mock allaqachon yakunlangan.' }, { status: 409 });

    const { data: mock, error: mockError } = await supabase
      .from('mocks')
      .select('id,track,reading_test_id,listening_test_id,writing_test_id,speaking_test_id')
      .eq('id', attempt.mock_id)
      .maybeSingle();
    if (mockError) throw mockError;
    if (!mock) return NextResponse.json({ error: 'Mock topilmadi.' }, { status: 404 });

    const expectedTestId = mock[sectionFields[section]] as string | null;
    const receivedTestId = String(body?.testId || '');
    if (!expectedTestId || !receivedTestId || expectedTestId !== receivedTestId) {
      return NextResponse.json({ error: 'Bu test mock sectioniga mos emas.' }, { status: 403 });
    }

    const correct = integerOrNull(body?.correct ?? body?.result?.correct);
    const wrong = integerOrNull(body?.wrong ?? body?.result?.wrong);
    const unanswered = integerOrNull(body?.unanswered ?? body?.result?.unanswered);

    let rawScore = numberOrNull(body?.rawScore ?? body?.score ?? body?.result?.rawScore ?? body?.result?.score);
    let maxScore = numberOrNull(body?.maxScore ?? body?.total ?? body?.result?.maxScore ?? body?.result?.total);
    let band = numberOrNull(body?.band ?? body?.result?.band);

    if (rawScore === null && correct !== null) rawScore = correct;
    if (maxScore === null && correct !== null && wrong !== null) maxScore = correct + wrong + (unanswered || 0);

    if (rawScore !== null && rawScore < 0) return NextResponse.json({ error: 'Score noto‘g‘ri.' }, { status: 400 });
    if (maxScore !== null && maxScore <= 0) return NextResponse.json({ error: 'Max score noto‘g‘ri.' }, { status: 400 });
    if (rawScore !== null && maxScore !== null && rawScore > maxScore) return NextResponse.json({ error: 'Score max score’dan katta bo‘lishi mumkin emas.' }, { status: 400 });
    if (band !== null && (band < 0 || band > 9)) return NextResponse.json({ error: 'Band noto‘g‘ri.' }, { status: 400 });
    if (correct !== null && wrong !== null && unanswered !== null && maxScore !== null && correct + wrong + unanswered !== Math.round(maxScore)) {
      return NextResponse.json({ error: 'Javoblar soni umumiy savollar soniga mos emas.' }, { status: 400 });
    }

    if (band === null && mock.track === 'ielts' && rawScore !== null && maxScore !== null) {
      band = ieltsBand(section, rawScore, maxScore);
    }

    const safeDetails = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? body.details as Record<string, unknown>
      : {};
    const submissionId = String(safeDetails.submissionId || body?.submissionId || '').trim().slice(0, 100);
    const details = {
      ...safeDetails,
      ...(submissionId ? { submissionId } : {}),
      correct,
      wrong,
      unanswered,
      source: 'html-bridge',
      savedAt: new Date().toISOString(),
    };

    if (JSON.stringify(details).length > 200000) {
      return NextResponse.json({ error: 'Result details juda katta.' }, { status: 413 });
    }

    if (submissionId) {
      const { data: previous, error: previousError } = await supabase
        .from('section_results')
        .select('section,raw_score,max_score,band,details,created_at')
        .eq('attempt_id', attempt.id)
        .eq('section', section)
        .maybeSingle();
      if (previousError) throw previousError;
      const previousDetails = previous?.details && typeof previous.details === 'object'
        ? previous.details as Record<string, unknown>
        : {};
      const previousTelegram = previousDetails.telegram && typeof previousDetails.telegram === 'object'
        ? previousDetails.telegram as Record<string, unknown>
        : {};
      if (previousDetails.submissionId === submissionId && Number(previousTelegram.sent || 0) > 0) {
        return NextResponse.json({ ok: true, duplicate: true, result: previous, telegram: previousTelegram });
      }
    }

    const { data: result, error: resultError } = await supabase
      .from('section_results')
      .upsert({
        attempt_id: attempt.id,
        section,
        raw_score: rawScore,
        max_score: maxScore,
        band,
        details,
      }, { onConflict: 'attempt_id,section' })
      .select('section,raw_score,max_score,band,details,created_at')
      .single();

    if (resultError) throw resultError;

    const [{ data: test, error: testError }, { data: admins, error: adminsError }] = await Promise.all([
      supabase.from('tests').select('id,title,track,skill').eq('id', receivedTestId).maybeSingle(),
      supabase.from('admins').select('telegram_id').eq('active', true),
    ]);
    if (testError) throw testError;
    if (adminsError) throw adminsError;
    if (!test) return NextResponse.json({ error: 'Test ma’lumotlari topilmadi.', saved: true, result }, { status: 500 });

    const telegram = await sendAdminTestResult({
      student: {
        firstName: session.firstName,
        lastName: session.lastName,
        telegramId: session.telegramId,
      },
      testTitle: test.title,
      track: test.track || mock.track,
      section,
      rawScore,
      maxScore,
      band,
      correct,
      wrong,
      unanswered,
      durationSeconds: integerOrNull(body?.durationSeconds ?? safeDetails.durationSeconds),
      submittedAt: typeof body?.submittedAt === 'string' ? body.submittedAt : new Date().toISOString(),
      details,
    }, (admins || []).map((admin) => String(admin.telegram_id || '')).filter(Boolean));

    const finalDetails = {
      ...details,
      telegram: { ...telegram, updatedAt: new Date().toISOString() },
    };
    const { error: telegramStateError } = await supabase
      .from('section_results')
      .update({ details: finalDetails })
      .eq('attempt_id', attempt.id)
      .eq('section', section);
    if (telegramStateError) throw telegramStateError;

    const finalResult = { ...result, details: finalDetails };
    if (!telegram.configured || telegram.sent === 0) {
      return NextResponse.json({
        error: telegram.error || 'Natija saqlandi, lekin Telegram admin’ga yuborilmadi.',
        saved: true,
        result: finalResult,
        telegram,
      }, { status: 503 });
    }

    return NextResponse.json({ ok: true, result: finalResult, telegram });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Result save server error' }, { status: 500 });
  }
}
