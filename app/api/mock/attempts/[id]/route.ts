import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: 'Avval platformaga kiring.' }, { status: 401 });

    const { id } = await params;
    const supabase = getServiceSupabase();

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,student_id,mock_id,status,started_at,completed_at,overall_score,overall_band')
      .eq('id', id)
      .eq('student_id', session.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt || !attempt.mock_id) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });

    const { data: mock, error: mockError } = await supabase
      .from('mocks')
      .select('id,title,track,status,reading_test_id,listening_test_id,writing_test_id,speaking_test_id')
      .eq('id', attempt.mock_id)
      .maybeSingle();

    if (mockError) throw mockError;
    if (!mock) return NextResponse.json({ error: 'Mock topilmadi.' }, { status: 404 });

    const refs = [
      ['reading', mock.reading_test_id],
      ['listening', mock.listening_test_id],
      ['writing', mock.writing_test_id],
      ['speaking', mock.speaking_test_id],
    ] as const;
    const ids = refs.map(([, testId]) => testId).filter((value): value is string => Boolean(value));

    let tests: Array<{ id: string; title: string; skill: string; status: string; file_name: string }> = [];
    if (ids.length) {
      const { data, error } = await supabase
        .from('tests')
        .select('id,title,skill,status,file_name')
        .in('id', ids)
        .eq('status', 'published');
      if (error) throw error;
      tests = data || [];
    }

    const { data: results, error: resultError } = await supabase
      .from('section_results')
      .select('section,raw_score,max_score,band,created_at')
      .eq('attempt_id', attempt.id);
    if (resultError) throw resultError;

    const testById = new Map(tests.map((test) => [test.id, test]));
    const resultBySection = new Map((results || []).map((result) => [result.section, result]));
    const sections = refs
      .filter(([, testId]) => Boolean(testId))
      .map(([section, testId]) => ({
        section,
        test: testId ? testById.get(testId) || null : null,
        result: resultBySection.get(section) || null,
      }));

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
        overallScore: attempt.overall_score,
        overallBand: attempt.overall_band,
      },
      mock: { id: mock.id, title: mock.title, track: mock.track, status: mock.status },
      sections,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock attempt server error' }, { status: 500 });
  }
}
