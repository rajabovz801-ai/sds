import { MockAttemptClient } from '@/components/MockAttemptClient';
import { PlatformNav } from '@/components/PlatformNav';

export default async function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="platformRoot">
      <PlatformNav />
      <main className="platformMain">
        <MockAttemptClient id={id} />
      </main>
    </div>
  );
}
