import 'server-only';

import { getServiceSupabase } from '@/lib/supabase/server';

export const SPEAKING_PRACTICE_AUDIO_BUCKET = 'speaking-practice-audio';

let bucketReadyPromise: Promise<void> | null = null;

async function ensureBucketOnce() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((bucket) => bucket.id === SPEAKING_PRACTICE_AUDIO_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(SPEAKING_PRACTICE_AUDIO_BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

export async function ensureSpeakingPracticeAudioBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = ensureBucketOnce().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }
  await bucketReadyPromise;
}

function safeSegment(value: string) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'item';
}

export function speakingPracticeAudioPath(studentId: string, day: number, topicId: string, questionIndex: number) {
  return `${safeSegment(studentId)}/day-${day}/${safeSegment(topicId)}-q${questionIndex + 1}-${Date.now()}-${crypto.randomUUID()}.mp3`;
}
