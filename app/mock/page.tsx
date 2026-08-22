import { MockTrackChoiceClient } from '@/components/MockTrackChoiceClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function MockPage() {
  await requireServerSession('/mock');
  return <MockTrackChoiceClient />;
}
