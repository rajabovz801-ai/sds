import { TestViewerClient } from '@/components/TestViewerClient';

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
  return (
    <TestViewerClient
      id={id}
      attemptId={first(query.attempt)}
      mode={first(query.mode)}
      section={first(query.section)}
    />
  );
}
