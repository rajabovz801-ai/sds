import { notFound } from 'next/navigation';
import { CefrSpeakingMockClient } from '@/components/CefrSpeakingMockClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getCefrSpeakingMock } from '@/lib/cefrSpeaking';

export default async function CefrSpeakingMockOnePage() {
  await requireStudent('/cefr/speaking/mock-1');
  const mock = await getCefrSpeakingMock();
  if (!mock) notFound();
  return <CefrSpeakingMockClient title={mock.title} />;
}
