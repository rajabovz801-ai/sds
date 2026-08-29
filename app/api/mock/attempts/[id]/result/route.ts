import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
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

function storedDelivery(details: Record<string, unknown>) {
  return details.telegram && typeof details.telegram === 'object'
    ? details.telegram as Record<string, unknown>
    : {};
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const section = String(body?.section || '').toLowerCase() as SectionName;
    const testSessionId = String(body?.testSessionId || '').trim();
    if (!Object.prototype.hasOwnProperty.call(sectionFields, section)) {
      return NextResponse.json({ error: 'Section noto‘g‘ri.' }, { status: 400 });
    }
    if (!testSessionId) return NextResponse.json({ error: 'Test session ID topilmadi.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,student_id,mock_id,status')
      .eq('id', id)
      .eq('student_id', student.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt?.mock_id) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });
    if (attempt.status === 'completed') return NextResponse.json({ ok: true, duplicate: true, saved: true });

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
    if (correct !== null && rawScore !== null && rawScore !== correct) return NextResponse.json({ error: 'Score va correct soni mos emas.' }, { status: 400 });
    if (rawScore !== null && rawScore < 0) return NextResponse.json({ error: 'Score noto‘g‘ri.' }, { status: 400 });
    if (maxScore !== null && maxScore <= 0) return NextResponse.json({ error: 'Max score noto‘g‘ri.' }, { status: 400 });
    if (rawScore !== null && maxScore !== null && rawScore > maxScore) return NextResponse.json({ error: 'Score max score’dan katta bo‘lishi mumkin emas.' }, { status: 400 });
    if (band !== null && (band < 0 || band > 9)) return NextResponse.json({ error: 'Band noto‘g‘ri.' }, { status: 400 });
    if (correct !== null && wrong !== null && unanswered !== null && maxScore !== null && correct + wrong + unanswered !== Math.round(maxScore)) {
      return NextResponse.json({ error: 'Javoblar soni umumiy savollar soniga mos emas.' }, { status: 400 });
    }
    if (mock.track === 'ielts' && rawScore !== null && maxScore !== null) {
      const serverBand = ieltsBand(section, rawScore, maxScore);
      if (serverBand !== null) band = serverBand;
    }

    const safeDetails = body?.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? body.details as Record<string, unknown>
      : {};
    const submissionId = String(safeDetails.submissionId || body?.submissionId || '').trim().slice(0, 100);
    const savedAt = new Date().toISOString();
    const details = {
      ...safeDetails,
      ...(submissionId ? { submissionId } : {}),
      testId: receivedTestId,
      testSessionId,
      correct,
      wrong,
      unanswered,
      source: 'html-bridge',
      savedAt,
    };
    if (JSON.stringify(details).length > 200000) return NextResponse.json({ error: 'Result details juda katta.' }, { status: 413 });

    const [{ data: exam, error: examError }, { data: test, error: testError }, { data: previous, error: previousError }] = await Promise.all([
      supabase
        .from('test_sessions')
        .select('id,status,started_at,expires_at,client_submission_id,delivery,superseded')
        .eq('id', testSessionId)
        .eq('student_id', student.studentId)
        .eq('test_id', receivedTestId)
        .eq('mock_attempt_id', attempt.id)
        .eq('mode', 'mock')
        .eq('section', section)
        .eq('superseded', false)
        .maybeSingle(),
      supabase.from('tests').select('id,title,track,skill').eq('id', receivedTestId).maybeSingle(),
      supabase
        .from('section_results')
        .select('section,raw_score,max_score,band,details,created_at')
        .eq('attempt_id', attempt.id)
        .eq('section', section)
        .maybeSingle(),
    ]);
    if (examError) throw examError;
    if (testError) throw testError;
    if (previousError) throw previousError;
    if (!exam) return NextResponse.json({ error: 'Bu test session sizga tegishli emas.' }, { status: 403 });
    if (!test) return NextResponse.json({ error: 'Test ma’lumotlari topilmadi.' }, { status: 404 });

    if (!previous && exam.status === 'in_progress' && Date.now() > new Date(exam.expires_at).getTime() + 30_000) {
      await supabase
        .from('test_sessions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', exam.id)
        .eq('student_id', student.studentId)
        .eq('status', 'in_progress');
      return NextResponse.json({ error: 'Test vaqti tugagan. Kech yuborilgan natija qabul qilinmadi.' }, { status: 409 });
    }

    if (previous) {
      const previousDetails = previous.details && typeof previous.details === 'object'
        ? previous.details as Record<string, unknown>
        : {};
      const previousTelegram = storedDelivery(previousDetails);
      const sameSubmission = Boolean(submissionId && previousDetails.submissionId === submissionId);
      if (!sameSubmission || Number(previousTelegram.sent || 0) > 0) {
        return NextResponse.json({ ok: true, duplicate: true, saved: true, result: previous });
      }
    } else {
      if (exam.status !== 'in_progress') return NextResponse.json({ ok: true, duplicate: true, saved: true });
      const { error: resultError } = await supabase
        .from('section_results')
        .insert({ attempt_id: attempt.id, section, raw_score: rawScore, max_score: maxScore, band, details });
      if (resultError) throw resultError;
    }

    const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(exam.started_at).getTime()) / 1000));
    const limitSeconds = Math.max(0, Math.round((new Date(exam.expires_at).getTime() - new Date(exam.started_at).getTime()) / 1000));
    const durationSeconds = Math.min(limitSeconds, integerOrNull(body?.durationSeconds ?? safeDetails.durationSeconds) ?? elapsedSeconds);
    const telegram = await sendAdminTestResult({
      student: { firstName: student.firstName, lastName: student.lastName, telegramId: student.telegramId },
      testTitle: test.title,
      track: test.track || mock.track,
      section,
      rawScore,
      maxScore,
      band,
      correct,
      wrong,
      unanswered,
      durationSeconds,
      submittedAt: savedAt,
      details,
    });

    const finalDetails = { ...details, telegram: { ...telegram, updatedAt: new Date().toISOString() } };
    const [{ data: finalResult, error: resultStateError }, { error: examStateError }] = await Promise.all([
      supabase
        .from('section_results')
        .update({ raw_score: rawScore, max_score: maxScore, band, details: finalDetails })
        .eq('attempt_id', attempt.id)
        .eq('section', section)
        .select('section,raw_score,max_score,band,details,created_at')
        .single(),
      supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          submitted_at: savedAt,
          raw_score: rawScore,
          max_score: maxScore,
          band,
          correct_count: correct,
          wrong_count: wrong,
          unanswered_count: unanswered,
          duration_seconds: durationSeconds,
          client_submission_id: submissionId || null,
          details,
          delivery: telegram,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exam.id)
        .eq('student_id', student.studentId)
        .eq('superseded', false),
    ]);
    if (resultStateError) throw resultStateError;
    if (examStateError) throw examStateError;

    if (!telegram.configured || telegram.sent === 0) {
      return NextResponse.json({
        ok: true,
        saved: true,
        deliveryPending: true,
        result: finalResult,
      });
    }

    return NextResponse.json({ ok: true, saved: true, result: finalResult });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Result save server error' }, { status: 500 });
  }
}
