import { getPublicSupabase } from '@/lib/supabase/server';

export type TestTrack = 'ielts' | 'cefr';
export type TestSkill = 'reading' | 'listening' | 'writing' | 'speaking' | 'full-mock';
export type TestStatus = 'published' | 'draft';

export type CloudTest = {
  id: string;
  title: string;
  description: string;
  track: TestTrack;
  skill: TestSkill;
  status: TestStatus;
  fileName: string;
  filePath: string;
  durationMinutes: number;
  dailyTaskEnabled?: boolean;
  dailyTaskPoints?: number;
  createdAt: string;
  updatedAt: string;
};

type TestRow = {
  id:string; title:string; description:string|null; track:TestTrack; skill:TestSkill; status:TestStatus;
  file_name:string; file_path:string; duration_minutes?:number|null; daily_task_enabled?:boolean|null; daily_task_points?:number|null; created_at:string; updated_at:string;
};

export function mapTest(row: TestRow): CloudTest {
  return {
    id:row.id,title:row.title,description:row.description||'',track:row.track,skill:row.skill,status:row.status,
    fileName:row.file_name,filePath:row.file_path,durationMinutes:Number(row.duration_minutes)||60,
    dailyTaskEnabled:Boolean(row.daily_task_enabled),dailyTaskPoints:Number(row.daily_task_points)||20,
    createdAt:row.created_at,updatedAt:row.updated_at
  };
}

export async function listPublishedTests(): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const {data,error} = await supabase.from('tests').select('*').eq('status','published').order('updated_at',{ascending:false});
  if(error) throw error;
  return ((data||[]) as TestRow[]).map(mapTest);
}

export async function listDailyTasks(): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('status', 'published')
    .eq('daily_task_enabled', true)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as TestRow[]).map(mapTest);
}

export async function listPublishedTestsBy(track: TestTrack, skill: TestSkill): Promise<CloudTest[]> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('status', 'published')
    .eq('track', track)
    .eq('skill', skill)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as TestRow[]).map(mapTest);
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
