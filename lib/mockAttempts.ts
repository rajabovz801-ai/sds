import { getServiceSupabase } from '@/lib/supabase/server';

export type MockResultDetails = {
  correct?: number | null;
  wrong?: number | null;
  unanswered?: number | null;
  [key: string]: unknown;
};

export type MockFlowStage = 'listening_video' | 'listening_test' | 'reading_video' | 'reading_test' | 'completed';

export type MockAttemptData = {
  attempt: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    overallScore: number | null;
    overallBand: number | null;
  };
  mock: {
    id: string;
    title: string;
    track: string;
    status: string;
    hasListeningVideo: boolean;
    hasReadingVideo: boolean;
  };
  candidate: { id: string | null };
  progress: {
    stage: MockFlowStage;
    listeningVideoSeenAt: string | null;
    readingVideoSeenAt: string | null;
  };
  sections: Array<{
    section: string;
    test: { id: string; title: string; skill: string; file_name: string } | null;
    result: {
      raw_score: number | null;
      max_score: number | null;
      band: number | null;
      details?: MockResultDetails;
    } | null;
  }>;
};

export async function getMockAttempt(studentId: string, attemptId: string): Promise<MockAttemptData | null> {
  const supabase = getServiceSupabase();
  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .select('id,student_id,mock_id,status,started_at,completed_at,overall_score,overall_band')
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .eq('attempt_type', 'mock')
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt?.mock_id) return null;

  const { data: mock, error: mockError } = await supabase
    .from('mocks')
    .select('id,title,track,status,reading_test_id,listening_test_id,writing_test_id,speaking_test_id,listening_video_path,reading_video_path')
    .eq('id', attempt.mock_id)
    .maybeSingle();
  if (mockError) throw mockError;
  if (!mock) return null;

  const refs = [
    ['listening', mock.listening_test_id],
    ['reading', mock.reading_test_id],
    ['writing', mock.writing_test_id],
    ['speaking', mock.speaking_test_id],
  ] as const;
  const ids = refs.map(([, testId]) => testId).filter((value): value is string => Boolean(value));

  const [tests, results, accessResult, progressResult] = await Promise.all([
    (async () => {
      if (!ids.length) return [] as Array<{ id: string; title: string; skill: string; status: string; file_name: string }>;
      const { data, error } = await supabase.from('tests').select('id,title,skill,status,file_name').in('id', ids).eq('status', 'published');
      if (error) throw error;
      return data || [];
    })(),
    (async () => {
      const { data, error } = await supabase
        .from('section_results')
        .select('section,raw_score,max_score,band,details,created_at')
        .eq('attempt_id', attempt.id);
      if (error) throw error;
      return data || [];
    })(),
    supabase.from('mock_access_codes').select('candidate_id').eq('mock_id', mock.id).eq('student_id', studentId).maybeSingle(),
    supabase.from('mock_attempt_progress').select('stage,listening_video_seen_at,reading_video_seen_at').eq('attempt_id', attempt.id).maybeSingle(),
  ]);
  if (accessResult.error) throw accessResult.error;
  if (progressResult.error) throw progressResult.error;

  const testById = new Map(tests.map((test) => [test.id, test]));
  const resultBySection = new Map(results.map((result) => [result.section, result]));
  const sections = refs.filter(([, testId]) => Boolean(testId)).map(([section, testId]) => ({
    section,
    test: testId ? testById.get(testId) || null : null,
    result: resultBySection.get(section) || null,
  }));

  const listeningDone = resultBySection.has('listening');
  const readingDone = resultBySection.has('reading');
  const progress = progressResult.data;
  let stage: MockFlowStage = 'listening_video';
  if (attempt.status === 'completed' || readingDone) stage = 'completed';
  else if (listeningDone) stage = progress?.reading_video_seen_at ? 'reading_test' : 'reading_video';
  else if (progress?.listening_video_seen_at) stage = 'listening_test';

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
      overallScore: attempt.overall_score,
      overallBand: attempt.overall_band,
    },
    mock: {
      id: mock.id,
      title: mock.title,
      track: mock.track,
      status: mock.status,
      hasListeningVideo: Boolean(mock.listening_video_path),
      hasReadingVideo: Boolean(mock.reading_video_path),
    },
    candidate: { id: accessResult.data?.candidate_id || null },
    progress: {
      stage,
      listeningVideoSeenAt: progress?.listening_video_seen_at || null,
      readingVideoSeenAt: progress?.reading_video_seen_at || null,
    },
    sections,
  };
}
