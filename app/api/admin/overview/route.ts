import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

type Row = Record<string, any>;

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentage(score: unknown, maxScore: unknown) {
  const scoreValue = numberOrNull(score);
  const maxValue = numberOrNull(maxScore);
  if (scoreValue === null || maxValue === null || maxValue <= 0) return null;
  return Number(((scoreValue / maxValue) * 100).toFixed(1));
}

function migrationMessage(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === '42P01' || value?.code === '42703') {
    return 'Admin statistika bazasi o‘rnatilmagan. Supabase exam-control migrationini ishga tushiring.';
  }
  return value?.message || 'Admin statistikasi yuklanmadi.';
}

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const { error: expiryError } = await supabase
      .from('test_sessions')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'in_progress')
      .lt('expires_at', now);
    if (expiryError) throw expiryError;

    const [testQuery, studentQuery, sessionQuery, attemptQuery, mockQuery] = await Promise.all([
      supabase.from('tests').select('id,title,track,skill,status,duration_minutes,updated_at').order('updated_at', { ascending: false }),
      supabase.from('students').select('*').order('first_name', { ascending: true }).limit(1000),
      supabase.from('test_sessions').select('id,student_id,test_id,mock_attempt_id,mode,section,status,started_at,expires_at,submitted_at,raw_score,max_score,band,correct_count,wrong_count,unanswered_count,duration_seconds,violation_count,delivery').order('started_at', { ascending: false }).limit(2000),
      supabase.from('attempts').select('id,student_id,mock_id,status,started_at,completed_at,overall_score,overall_band,attempt_type').eq('attempt_type', 'mock').order('started_at', { ascending: false }).limit(1000),
      supabase.from('mocks').select('id,title,track,status'),
    ]);

    for (const query of [testQuery, studentQuery, sessionQuery, attemptQuery, mockQuery]) {
      if (query.error) throw query.error;
    }

    const tests = (testQuery.data || []) as Row[];
    const students = (studentQuery.data || []) as Row[];
    const sessions = (sessionQuery.data || []) as Row[];
    const attempts = (attemptQuery.data || []) as Row[];
    const mocks = (mockQuery.data || []) as Row[];
    const testById = new Map(tests.map((test) => [String(test.id), test]));
    const mockById = new Map(mocks.map((mock) => [String(mock.id), mock]));

    const results = sessions.map((session) => {
      const test = testById.get(String(session.test_id));
      const accuracy = percentage(session.raw_score, session.max_score);
      const delivery = session.delivery && typeof session.delivery === 'object' ? session.delivery : {};
      return {
        id: `session:${session.id}`,
        studentId: String(session.student_id),
        testId: String(session.test_id),
        title: test?.title || 'Test',
        track: test?.track || '',
        skill: session.section || test?.skill || '',
        mode: session.mode,
        status: session.status,
        score: numberOrNull(session.raw_score),
        maxScore: numberOrNull(session.max_score),
        accuracy,
        band: numberOrNull(session.band),
        correct: numberOrNull(session.correct_count),
        wrong: numberOrNull(session.wrong_count),
        unanswered: numberOrNull(session.unanswered_count),
        durationSeconds: numberOrNull(session.duration_seconds),
        violations: Math.max(0, Number(session.violation_count) || 0),
        deliverySent: Number(delivery.sent || 0) > 0,
        startedAt: session.started_at,
        completedAt: session.submitted_at,
      };
    });

    for (const attempt of attempts) {
      const mock = mockById.get(String(attempt.mock_id));
      results.push({
        id: `mock:${attempt.id}`,
        studentId: String(attempt.student_id),
        testId: String(attempt.mock_id || ''),
        title: mock?.title || 'Full Mock',
        track: mock?.track || '',
        skill: 'full-mock',
        mode: 'mock-overall',
        status: attempt.status,
        score: numberOrNull(attempt.overall_score),
        maxScore: attempt.overall_score == null ? null : 100,
        accuracy: numberOrNull(attempt.overall_score),
        band: numberOrNull(attempt.overall_band),
        correct: null,
        wrong: null,
        unanswered: null,
        durationSeconds: attempt.completed_at
          ? Math.max(0, Math.round((new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 1000))
          : null,
        violations: 0,
        deliverySent: false,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
      });
    }

    const studentRows = students.map((student) => {
      const studentResults = results.filter((result) => result.studentId === String(student.id));
      const completed = studentResults.filter((result) => result.status === 'completed');
      const accuracies = completed.map((result) => result.accuracy).filter((value): value is number => value !== null);
      const bands = completed.map((result) => result.band).filter((value): value is number => value !== null);
      const latest = studentResults
        .map((result) => result.completedAt || result.startedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || null;
      return {
        id: String(student.id),
        firstName: String(student.first_name || ''),
        lastName: String(student.last_name || ''),
        telegramId: String(student.telegram_id || ''),
        username: student.telegram_username ? String(student.telegram_username) : null,
        status: String(student.status || 'active'),
        joinedAt: student.created_at || null,
        testsCompleted: completed.length,
        averageAccuracy: accuracies.length ? Number((accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length).toFixed(1)) : null,
        averageBand: bands.length ? Number((bands.reduce((sum, value) => sum + value, 0) / bands.length).toFixed(1)) : null,
        violations: studentResults.reduce((sum, result) => sum + result.violations, 0),
        lastActivity: latest,
      };
    });

    const completedResults = results.filter((result) => result.status === 'completed');
    const allAccuracies = completedResults.map((result) => result.accuracy).filter((value): value is number => value !== null);
    const skillMap = new Map<string, number[]>();
    for (const result of completedResults) {
      if (result.accuracy === null || result.mode === 'mock-overall') continue;
      const values = skillMap.get(result.skill) || [];
      values.push(result.accuracy);
      skillMap.set(result.skill, values);
    }
    const skills = [...skillMap.entries()].map(([skill, values]) => ({
      skill,
      attempts: values.length,
      average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)),
    }));

    const activity = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        count: completedResults.filter((result) => String(result.completedAt || '').slice(0, 10) === key).length,
      };
    });

    return NextResponse.json({
      metrics: {
        students: studentRows.length,
        activeStudents: studentRows.filter((student) => student.status === 'active').length,
        blockedStudents: studentRows.filter((student) => student.status !== 'active').length,
        completedResults: completedResults.length,
        averageAccuracy: allAccuracies.length
          ? Number((allAccuracies.reduce((sum, value) => sum + value, 0) / allAccuracies.length).toFixed(1))
          : null,
      },
      students: studentRows,
      results: results.sort((left, right) => new Date(right.completedAt || right.startedAt).getTime() - new Date(left.completedAt || left.startedAt).getTime()),
      activity,
      skills,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: migrationMessage(error) }, { status: 500 });
  }
}
