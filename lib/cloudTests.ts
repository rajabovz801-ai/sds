import { getPublicSupabase, getServiceSupabase } from '@/lib/supabase/server';

export type TestTrack = 'ielts' | 'cefr';
export type TestSkill = 'reading' | 'listening' | 'writing' | 'speaking' | 'full-mock' | 'vocabulary';
export type TestStatus = 'published' | 'draft';
export type TestScope = 'part-1' | 'part-2' | 'part-3' | 'part-4' | 'passage-1' | 'passage-2' | 'passage-3' | 'full-test';

export type CloudTest = {
  id: string;
  title: string;
  description: string;
  track: TestTrack;
  skill: TestSkill;
  status: TestStatus;
  testScope?: TestScope | null;
  fileName: string;
  filePath: string;
  durationMinutes: number;
  attemptCount?: number;
  dailyTaskEnabled?: boolean;
  dailyTaskPoints?: number;
  dailyTaskStartedAt?: string | null;
  dailyTaskExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TestRow = {
  id:string; title:string; description:string|null; track:TestTrack; skill:TestSkill; status:TestStatus;
  test_scope?:TestScope|null; file_name:string; file_path:string; duration_minutes?:number|null; daily_task_enabled?:boolean|null; daily_task_points?:number|null;
  daily_task_started_at?:string|null; daily_task_expires_at?:string|null; created_at:string; updated_at:string;
};

export function mapTest(row: TestRow): CloudTest {
  return {
    id:row.id,title:row.title,description:row.description||'',track:row.track,skill:row.skill,status:row.status,
    testScope:row.test_scope||null,fileName:row.file_name,filePath:row.file_path,durationMinutes:Number(row.duration_minutes)||60,
    dailyTaskEnabled:Boolean(row.daily_task_enabled),dailyTaskPoints:Number(row.daily_task_points)||20,
    dailyTaskStartedAt:row.daily_task_started_at||null,dailyTaskExpiresAt:row.daily_task_expires_at||null,
    createdAt:row.created_at,updatedAt:row.updated_at
  };
}

export async function listPublishedTests(): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const {data,error} = await supabase.from('tests').select('*').eq('status','published').eq('mock_only', false).order('updated_at',{ascending:false});
  if(error) throw error;
  return ((data||[]) as TestRow[]).map(mapTest);
}

export async function listDailyTasks(): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('status', 'published')
    .eq('mock_only', false)
    .eq('daily_task_enabled', true)
    .gt('daily_task_expires_at', now)
    .order('daily_task_expires_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as TestRow[]).map(mapTest);
}

export async function listPublishedTestsBy(track: TestTrack, skill: TestSkill): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('status', 'published')
    .eq('mock_only', false)
    .eq('track', track)
    .eq('skill', skill)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as TestRow[]).map(mapTest);
}

export async function listPublishedTestsByWithAttempts(
  track: TestTrack,
  skill: TestSkill,
  studentId: string,
): Promise<CloudTest[]> {
  const tests = await listPublishedTestsBy(track, skill);
  if (!tests.length) return tests;

  const supabase = getServiceSupabase();
  const testIds = tests.map((test) => test.id);
  const { data, error } = await supabase
    .from('test_sessions')
    .select('test_id')
    .eq('student_id', studentId)
    .eq('mode', 'practice')
    .in('test_id', testIds);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const testId = String(row.test_id || '');
    if (!testId) continue;
    counts.set(testId, (counts.get(testId) || 0) + 1);
  }

  return tests.map((test) => ({
    ...test,
    attemptCount: counts.get(test.id) || 0,
  }));
}

export async function getPublishedTest(id: string): Promise<CloudTest | null> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data ? mapTest(data as TestRow) : null;
}
