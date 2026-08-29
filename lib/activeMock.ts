import { getServiceSupabase } from '@/lib/supabase/server';

export type ActiveMockData = {
  id: string;
  title: string;
  candidateId: string | null;
  attempt: { id: string; status: string } | null;
};

export async function getActiveMockForStudent(studentId: string): Promise<ActiveMockData | null> {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();
  const { data: mocks, error } = await supabase
    .from('mocks')
    .select('id,title,starts_at,ends_at')
    .eq('track', 'ielts')
    .eq('status', 'published')
    .eq('dashboard_enabled', true)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;

  const mock = (mocks || []).find((item) => (!item.starts_at || item.starts_at <= now) && (!item.ends_at || item.ends_at > now));
  if (!mock) return null;

  const [accessResult, attemptResult] = await Promise.all([
    supabase.from('mock_access_codes').select('candidate_id').eq('mock_id', mock.id).eq('student_id', studentId).maybeSingle(),
    supabase.from('attempts').select('id,status').eq('mock_id', mock.id).eq('student_id', studentId).eq('attempt_type', 'mock').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (accessResult.error) throw accessResult.error;
  if (attemptResult.error) throw attemptResult.error;

  return {
    id: mock.id,
    title: mock.title,
    candidateId: accessResult.data?.candidate_id || null,
    attempt: attemptResult.data || null,
  };
}
