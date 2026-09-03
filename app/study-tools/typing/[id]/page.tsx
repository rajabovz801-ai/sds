import { notFound } from 'next/navigation';
import { TypingExerciseClient } from '@/components/TypingExerciseClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ExerciseRow = {
  id: string;
  title: string;
  prompt_title: string;
  prompt: string;
  content: string;
};

export default async function TypingExercisePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStudent('/study-tools/typing');
  const { id } = await params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('typing_exercises')
    .select('id,title,prompt_title,prompt,content')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !data) notFound();
  const exercise = data as ExerciseRow;

  return (
    <TypingExerciseClient exercise={{
      id: String(exercise.id),
      title: String(exercise.title || 'Typing Exercise'),
      promptTitle: String(exercise.prompt_title || 'Writing Task 2'),
      prompt: String(exercise.prompt || ''),
      content: String(exercise.content || ''),
    }} />
  );
}
