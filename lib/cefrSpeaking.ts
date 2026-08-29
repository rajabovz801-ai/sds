import 'server-only';

import { getServiceSupabase } from '@/lib/supabase/server';

export const CEFR_SPEAKING_MOCK_KEY = 'mock-1';
export const CEFR_SPEAKING_VIDEO_BUCKET = 'mock-assets';
export const CEFR_SPEAKING_AUDIO_BUCKET = 'cefr-speaking-audio';

export type CefrSpeakingMockRow = {
  id: string;
  mock_key: string;
  title: string;
  instruction_video_path: string | null;
  status: 'draft' | 'published';
};

export async function getCefrSpeakingMock() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('cefr_speaking_mocks')
    .select('id,mock_key,title,instruction_video_path,status')
    .eq('mock_key', CEFR_SPEAKING_MOCK_KEY)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as CefrSpeakingMockRow | null;
}

export async function ensureCefrSpeakingAudioBucket() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((bucket) => bucket.id === CEFR_SPEAKING_AUDIO_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(CEFR_SPEAKING_AUDIO_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ['audio/webm', 'audio/ogg', 'audio/mp4', 'application/octet-stream'],
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

export async function ensureCefrSpeakingVideoBucket() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((bucket) => bucket.id === CEFR_SPEAKING_VIDEO_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(CEFR_SPEAKING_VIDEO_BUCKET, {
    public: false,
    fileSizeLimit: 80 * 1024 * 1024,
    allowedMimeTypes: ['video/mp4'],
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

export function normalizeCandidateName(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function safeStorageName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'candidate';
}

export function extensionForAudioMime(mimeType: string) {
  const type = mimeType.toLowerCase();
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mp4')) return 'm4a';
  return 'webm';
}
