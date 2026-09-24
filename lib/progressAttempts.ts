import { getServiceSupabase } from '@/lib/supabase/server';

export type ProgressSkill = 'reading' | 'listening' | 'writing' | 'full-mock';

export type ProgressAttempt = {
  id: string;
  testId: string;
  title: string;
  skill: string;
  part: string;
  collection: string;
  band: number | null;
  rawScore: number | null;
  maxScore: number | null;
  correctCount: number;
  percentage: number | null;
  durationSeconds: number;
  completedAt: string;
};

type SessionRow = {
  id: string;
  test_id: string;
  raw_score: number | string | null;
  band: number | string | null;
  max_score: number | string | null;
  correct_count: number | null;
  duration_seconds: number | null;
  submitted_at: string | null;
  created_at: string;
  tests: {
    title: string;
    skill: string;
    test_scope: string | null;
    test_collection: string | null;
  } | Array<{
    title: string;
    skill: string;
    test_scope: string | null;
    test_collection: string | null;
  }> | null;
};

function n(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function meta(row: SessionRow) {
  return Array.isArray(row.tests) ? row.tests[0] : row.tests;
}

function partLabel(scope: string | null | undefined) {
  if (!scope) return 'Full Test';
  const clean = scope.replace('-', ' ');
  return clean.replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function getProgressAttempts(studentId: string): Promise<ProgressAttempt[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id,test_id,raw_score,band,max_score,correct_count,duration_seconds,submitted_at,created_at,tests!inner(title,skill,test_scope,test_collection,track,mock_only)')
    .eq('student_id', studentId)
    .eq('tests.track', 'ielts')
    .eq('tests.mock_only', false)
    .in('tests.skill', ['reading', 'listening'])
    .eq('status', 'completed')
    .eq('superseded', false)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(120);

  if (error) throw error;

  return ((data || []) as unknown as SessionRow[]).map((row) => {
    const test = meta(row);
    const raw = n(row.raw_score);
    const max = n(row.max_score);
    const percentage = raw !== null && max !== null && max > 0 ? Math.round((raw / max) * 100) : null;

    return {
      id: row.id,
      testId: row.test_id,
      title: test?.title || 'Test',
      skill: test?.skill || 'reading',
      part: partLabel(test?.test_scope),
      collection: test?.test_collection || 'real-exam',
      band: n(row.band),
      rawScore: raw,
      maxScore: max,
      correctCount: Math.max(0, Number(row.correct_count) || 0),
      percentage,
      durationSeconds: Math.max(0, Number(row.duration_seconds) || 0),
      completedAt: row.submitted_at || row.created_at,
    };
  });
}

export type AttemptReview = ProgressAttempt & {
  answers: Array<{
    id: string;
    answer: string;
    correctAnswer: string;
    correct: boolean;
    status: string;
  }>;
};

export async function getProgressAttempt(studentId: string, attemptId: string): Promise<AttemptReview | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id,test_id,raw_score,band,max_score,correct_count,duration_seconds,submitted_at,created_at,details,tests!inner(title,skill,test_scope,test_collection,track,mock_only)')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .eq('tests.track', 'ielts')
    .eq('tests.mock_only', false)
    .in('tests.skill', ['reading', 'listening'])
    .eq('status', 'completed')
    .eq('superseded', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SessionRow & { details?: Record<string, unknown> | null };
  const test = meta(row);
  const raw = n(row.raw_score);
  const max = n(row.max_score);
  const percentage = raw !== null && max !== null && max > 0 ? Math.round((raw / max) * 100) : null;
  const details = row.details && typeof row.details === 'object' ? row.details : {};
  const answerMap = details && typeof (details as any).answers === 'object' && (details as any).answers
    ? (details as any).answers as Record<string, any>
    : {};

  const answers = Object.entries(answerMap).map(([id, value]) => ({
    id,
    answer: String(value?.answer ?? ''),
    correctAnswer: String(value?.correctAnswer ?? ''),
    correct: Boolean(value?.correct),
    status: String(value?.status ?? ''),
  }));

  return {
    id: row.id,
    testId: row.test_id,
    title: test?.title || 'Test',
    skill: test?.skill || 'reading',
    part: partLabel(test?.test_scope),
    collection: test?.test_collection || 'real-exam',
    band: n(row.band),
    rawScore: raw,
    maxScore: max,
    correctCount: Math.max(0, Number(row.correct_count) || 0),
    percentage,
    durationSeconds: Math.max(0, Number(row.duration_seconds) || 0),
    completedAt: row.submitted_at || row.created_at,
    answers,
  };
}
