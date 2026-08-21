import { MockAccessClient } from '@/components/MockAccessClient';
import { PlatformNav } from '@/components/PlatformNav';

export default function MockPage() {
  return (
    <div className="platformRoot">
      <PlatformNav />
      <main className="platformMain">
        <MockAccessClient />
      </main>
    </div>
  );
}
