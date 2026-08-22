import { MockTrackChoiceClient } from '@/components/MockTrackChoiceClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';

export default async function MockPage() {
  const student = await requireStudent('/mock');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><MockTrackChoiceClient student={student} /></main></div>;
}
