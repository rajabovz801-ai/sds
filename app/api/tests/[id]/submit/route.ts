import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
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

function deliverySent(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  return Number((value as Record<string, unknown>).sent || 0) > 0;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const testSessionId = String(body?.testSessionId || '').trim();
    if (!testSessionId) return NextResponse.json({ error: 'Test session ID topilmadi.' }, { status: 400 });

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
    const submissionId = String(details.submissionId || body?.submissionId || '').trim().slice(0, 100);

    if (rawScore === null || maxScore === null || maxScore <= 0 || rawScore < 0 || rawScore > maxScore) {
      return NextResponse.json({ error: 'Test natijasi noto‘g‘ri.' }, { status: 400 });
    }
    if (correct !== null && rawScore !== correct) {
      return NextResponse.json({ error: 'Score va correct soni bir-biriga mos emas.' }, { status: 400 });
    }
    if (band !== null && (band < 0 || band > 9)) {
      return NextResponse.json({ error: 'Band noto‘g‘ri.' }, { status: 400 });
    }
    if (correct !== null && wrong !== null && unanswered !== null && correct + wrong + unanswered !== Math.round(maxScore)) {
      return NextResponse.json({ error: 'Javoblar soni umumiy savollar soniga mos emas.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const [{ data: test, error: testError }, { data: exam, error: examError }] = await Promise.all([
      supabase
        .from('tests')
        .select('id,title,track,skill,status')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('test_sessions')
        .select('id,status,started_at,expires_at,client_submission_id,delivery')
        .eq('id', testSessionId)
        .eq('student_id', student.studentId)
        .eq('test_id', id)
        .eq('mode', 'practice')
        .maybeSingle(),
    ]);

    if (testError) throw testError;
    if (examError) throw examError;
    if (!test) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });
    if (!exam) return NextResponse.json({ error: 'Bu test session sizga tegishli emas.' }, { status: 403 });

    if (exam.status === 'completed') {
      if (submissionId && exam.client_submission_id === submissionId && deliverySent(exam.delivery)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      if (!submissionId || exam.client_submission_id !== submissionId) {
        return NextResponse.json({ error: 'Bu test natijasi allaqachon saqlangan.' }, { status: 409 });
      }
    } else if (exam.status !== 'in_progress') {
      return NextResponse.json({ error: 'Bu test urinishining vaqti tugagan.' }, { status: 409 });
    }

    if (exam.status === 'in_progress' && Date.now() > new Date(exam.expires_at).getTime() + 30_000) {
      await supabase
        .from('test_sessions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', exam.id)
        .eq('student_id', student.studentId)
        .eq('status', 'in_progress');
      return NextResponse.json({ error: 'Test vaqti tugagan. Kech yuborilgan natija qabul qilinmadi.' }, { status: 409 });
    }

    const serverSubmittedAt = new Date().toISOString();
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(exam.started_at).getTime()) / 1000));
    const safeDuration = Math.min(
      Math.max(0, Math.round((new Date(exam.expires_at).getTime() - new Date(exam.started_at).getTime()) / 1000)),
      durationSeconds ?? elapsedSeconds,
    );
    const savedDetails = {
      ...details,
      ...(submissionId ? { submissionId } : {}),
      correct,
      wrong,
      unanswered,
      source: 'html-bridge',
      savedAt: serverSubmittedAt,
    };

    if (exam.status === 'in_progress') {
      const { data: completed, error: completeError } = await supabase
        .from('test_sessions')
        .update({
          status: 'completed',
          submitted_at: serverSubmittedAt,
          raw_score: rawScore,
          max_score: maxScore,
          band,
          correct_count: correct,
          wrong_count: wrong,
          unanswered_count: unanswered,
          duration_seconds: safeDuration,
          client_submission_id: submissionId || null,
          details: savedDetails,
          updated_at: serverSubmittedAt,
        })
        .eq('id', exam.id)
        .eq('student_id', student.studentId)
        .eq('status', 'in_progress')
        .select('id')
        .maybeSingle();
      if (completeError) throw completeError;
      if (!completed) return NextResponse.json({ error: 'Natija boshqa so‘rovda saqlangan.' }, { status: 409 });
    }

    const telegram = await sendAdminTestResult({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        telegramId: student.telegramId,
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
      durationSeconds: safeDuration,
      submittedAt: serverSubmittedAt,
      details: savedDetails,
    });

    const { error: deliveryError } = await supabase
      .from('test_sessions')
      .update({ delivery: { ...telegram, updatedAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
      .eq('id', exam.id)
      .eq('student_id', student.studentId);
    if (deliveryError) throw deliveryError;

    if (!telegram.configured || telegram.sent === 0) {
      return NextResponse.json({
        error: telegram.error || 'Natija saqlandi, lekin bot serveri qabul qilganini tasdiqlamadi.',
        saved: true,
      }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Natija yuborish server xatosi.' }, { status: 500 });
  }
}
