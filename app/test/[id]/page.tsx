import { TestViewerClient } from '@/components/TestViewerClient';
import { requireServerSession } from '@/lib/auth/server-session';

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
  await requireServerSession(`/test/${id}${nextQuery.size ? `?${nextQuery.toString()}` : ''}`);
  return (
    <TestViewerClient
      id={id}
      attemptId={attempt}
      mode={mode}
      section={section}
    />
  );
}
