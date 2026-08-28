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
        .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('test_sessions')
        .select('id,status,started_at,expires_at,client_submission_id,delivery,superseded')
        .eq('id', testSessionId)
        .eq('student_id', student.studentId)
        .eq('test_id', id)
        .eq('mode', 'practice')
        .eq('superseded', false)
        .maybeSingle(),
    ]);

    if (testError) throw testError;
    if (examError) throw examError;
    if (!test) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });
    if (!exam) return NextResponse.json({ error: 'Bu test session sizga tegishli emas.' }, { status: 403 });

    if (exam.status === 'completed') {
      const sameSubmission = Boolean(submissionId && exam.client_submission_id === submissionId);
      if (!sameSubmission || deliverySent(exam.delivery)) {
        return NextResponse.json({ ok: true, duplicate: true, saved: true });
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

    let newlyCompleted = false;
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
        .eq('superseded', false)
        .select('id')
        .maybeSingle();
      if (completeError) throw completeError;
      if (!completed) return NextResponse.json({ ok: true, duplicate: true, saved: true });
      newlyCompleted = true;
    }

    const taskStartedAt = test.daily_task_started_at ? new Date(test.daily_task_started_at).getTime() : 0;
    const taskExpiresAt = test.daily_task_expires_at ? new Date(test.daily_task_expires_at).getTime() : 0;
    const submittedAtMs = new Date(serverSubmittedAt).getTime();
    const rewardWindowOpen = Boolean(
      test.daily_task_enabled
      && taskStartedAt > 0
      && taskExpiresAt > submittedAtMs
      && submittedAtMs >= taskStartedAt,
    );

    if (newlyCompleted && rewardWindowOpen) {
      const accuracy = Math.max(0, Math.min(100, (rawScore / maxScore) * 100));
      const basePoints = Math.max(0, Math.min(100, Number(test.daily_task_points) || 20));
      const bonus = test.skill === 'vocabulary' ? 0 : accuracy >= 99.999 ? 10 : accuracy >= 90 ? 5 : 0;
      const { error: rewardError } = await supabase
        .from('daily_task_completions')
        .upsert({
          student_id: student.studentId,
          test_id: id,
          session_id: exam.id,
          points_awarded: basePoints + bonus,
          accuracy: Math.round(accuracy * 100) / 100,
          completed_at: serverSubmittedAt,
        }, { onConflict: 'student_id,test_id', ignoreDuplicates: true });
      if (rewardError) console.error('Daily task reward failed', rewardError);
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
      .eq('student_id', student.studentId)
      .eq('superseded', false);
    if (deliveryError) throw deliveryError;

    if (!telegram.configured || telegram.sent === 0) {
      return NextResponse.json({ ok: true, saved: true, deliveryPending: true });
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Natija yuborish server xatosi.' }, { status: 500 });
  }
}
