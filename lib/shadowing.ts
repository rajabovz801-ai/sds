import 'server-only';

import { getServiceSupabase } from '@/lib/supabase/server';

export const SHADOWING_VIDEO_BUCKET = 'mock-assets';
export const SHADOWING_MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export type ShadowingLesson = {
  id: string;
  sequenceNo: number;
  title: string;
  script: string;
  videoPath: string;
  status: 'draft' | 'published';
  dailyTaskEnabled: boolean;
  dailyTaskPoints: number;
  dailyTaskStartedAt: string | null;
  dailyTaskExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ShadowingRow = {
  id: string;
  sequence_no: number;
  title: string;
  script: string;
  video_path: string;
  status: 'draft' | 'published';
  daily_task_enabled: boolean | null;
  daily_task_points: number | null;
  daily_task_started_at: string | null;
  daily_task_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapShadowingLesson(row: ShadowingRow): ShadowingLesson {
  return {
    id: String(row.id),
    sequenceNo: Number(row.sequence_no) || 1,
    title: String(row.title || ''),
    script: String(row.script || ''),
    videoPath: String(row.video_path || ''),
    status: row.status === 'draft' ? 'draft' : 'published',
    dailyTaskEnabled: Boolean(row.daily_task_enabled),
    dailyTaskPoints: Math.max(0, Number(row.daily_task_points) || 20),
    dailyTaskStartedAt: row.daily_task_started_at || null,
    dailyTaskExpiresAt: row.daily_task_expires_at || null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

const SHADOWING_SELECT = 'id,sequence_no,title,script,video_path,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,created_at,updated_at';

export async function ensureShadowingVideoBucket() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((bucket) => bucket.id === SHADOWING_VIDEO_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(SHADOWING_VIDEO_BUCKET, {
    public: false,
    fileSizeLimit: SHADOWING_MAX_VIDEO_BYTES,
    allowedMimeTypes: ['video/mp4'],
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

export function safeShadowingStorageName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'shadowing.mp4';
}

export async function listPublishedShadowing(): Promise<ShadowingLesson[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('shadowing_lessons')
    .select(SHADOWING_SELECT)
    .eq('status', 'published')
    .order('sequence_no', { ascending: true })
    .limit(200);
  if (error) throw error;
  return ((data || []) as ShadowingRow[]).map(mapShadowingLesson);
}

export async function listDailyShadowing(): Promise<ShadowingLesson[]> {
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('shadowing_lessons')
    .select(SHADOWING_SELECT)
    .eq('status', 'published')
    .eq('daily_task_enabled', true)
    .gt('daily_task_expires_at', now)
    .order('daily_task_expires_at', { ascending: true });
  if (error) throw error;
  return ((data || []) as ShadowingRow[]).map(mapShadowingLesson);
}

export async function getPublishedShadowing(id: string): Promise<ShadowingLesson | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('shadowing_lessons')
    .select(SHADOWING_SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data ? mapShadowingLesson(data as ShadowingRow) : null;
}
