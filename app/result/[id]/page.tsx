import { MockResultClient } from '@/components/MockResultClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireServerSession(`/result/${id}`);
  return <div className="platformRoot"><PlatformNav /><main className="platformMain"><MockResultClient id={id} /></main></div>;
}
