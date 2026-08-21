import { MockResultClient } from '@/components/MockResultClient';
import { PlatformNav } from '@/components/PlatformNav';

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="platformRoot"><PlatformNav /><main className="platformMain"><MockResultClient id={id} /></main></div>;
}
