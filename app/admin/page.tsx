import { AdminAttemptResetPanel } from '@/components/AdminAttemptResetPanel';
import { AdminClient } from '@/components/AdminClient';
import { AdminMenuPreview } from '@/components/AdminMenuPreview';
import { requireAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminPage() {
  await requireAdminServerSession();
  return <div className="adminRoot"><AdminClient /><AdminMenuPreview /><AdminAttemptResetPanel /></div>;
}
