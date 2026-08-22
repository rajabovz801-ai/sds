import { MockAttemptClient } from '@/components/MockAttemptClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireServerSession(`/mock/${id}`);
  return (
    <div className="platformRoot">
      <PlatformNav />
      <main className="platformMain">
        <MockAttemptClient id={id} />
      </main>
    </div>
  );
}
