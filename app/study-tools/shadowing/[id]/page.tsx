import { notFound } from 'next/navigation';
import { ShadowingLessonClient } from '@/components/ShadowingLessonClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getPublishedShadowing, SHADOWING_VIDEO_BUCKET } from '@/lib/shadowing';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ShadowingLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const student = await requireStudent('/study-tools/shadowing');
  const { id } = await params;
  const lesson = await getPublishedShadowing(id);
  if (!lesson) notFound();

  const supabase = getServiceSupabase();
  const [{ data: signed, error: signedError }, { data: completion, error: completionError }] = await Promise.all([
    supabase.storage.from(SHADOWING_VIDEO_BUCKET).createSignedUrl(lesson.videoPath, 6 * 60 * 60),
    supabase
      .from('shadowing_daily_task_completions')
      .select('id')
      .eq('student_id', student.id)
      .eq('shadowing_id', lesson.id)
      .maybeSingle(),
  ]);

  if (signedError || !signed?.signedUrl) throw signedError || new Error('Shadowing video ochilmadi.');
  if (completionError) throw completionError;

  const now = Date.now();
  const startedAt = lesson.dailyTaskStartedAt ? new Date(lesson.dailyTaskStartedAt).getTime() : 0;
  const expiresAt = lesson.dailyTaskExpiresAt ? new Date(lesson.dailyTaskExpiresAt).getTime() : 0;
  const dailyTaskEnabled = Boolean(lesson.dailyTaskEnabled && startedAt > 0 && now >= startedAt && expiresAt > now);

  return (
    <ShadowingLessonClient
      lesson={{
        id: lesson.id,
        sequenceNo: lesson.sequenceNo,
        title: lesson.title,
        script: lesson.script,
        videoUrl: signed.signedUrl,
        dailyTaskEnabled,
        dailyTaskPoints: lesson.dailyTaskPoints,
      }}
      initiallyCompleted={Boolean(completion)}
    />
  );
}
