import { ListeningFullscreenResumeFix } from '@/components/ListeningFullscreenResumeFix';
import { ListeningIframeCleanup } from '@/components/ListeningIframeCleanup';
import { MockExamCompanion } from '@/components/MockExamCompanion';
import { MockListeningAnswerCompatibility } from '@/components/MockListeningAnswerCompatibility';
import { TestReliabilityGuard } from '@/components/TestReliabilityGuard';
import { TestViewerClient } from '@/components/TestViewerClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getPublishedTest } from '@/lib/cloudTests';
import { notFound } from 'next/navigation';

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const nextQuery = new URLSearchParams();
  const attempt = first(query.attempt);
  const mode = first(query.mode);
  const section = first(query.section);
  if (attempt) nextQuery.set('attempt', attempt);
  if (mode) nextQuery.set('mode', mode);
  if (section) nextQuery.set('section', section);
  const [, test] = await Promise.all([
    requireStudent(`/test/${id}${nextQuery.size ? `?${nextQuery.toString()}` : ''}`),
    getPublishedTest(id),
  ]);
  if (!test) notFound();
  const isListening = test.skill === 'listening';
  return (
    <>
      <TestReliabilityGuard />
      <ListeningIframeCleanup enabled={isListening} />
      <ListeningFullscreenResumeFix enabled={isListening} />
      <MockListeningAnswerCompatibility enabled={isListening && mode === 'mock'} />
      <MockExamCompanion attemptId={attempt} mode={mode} />
      <TestViewerClient
        id={id}
        initialData={{
          test: {
            id: test.id,
            title: test.title,
            track: test.track,
            skill: test.skill,
            fileName: test.fileName,
            durationMinutes: test.durationMinutes,
          },
          contentUrl: `/api/tests/${test.id}/content`,
        }}
        attemptId={attempt}
        mode={mode}
        section={section}
      />
    </>
  );
}
