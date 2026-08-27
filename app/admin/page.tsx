import { AdminAttemptResetPanel } from '@/components/AdminAttemptResetPanel';
import { AdminClient } from '@/components/AdminClient';
import { AdminDailyTasksPanel } from '@/components/AdminDailyTasksPanel';
import { AdminMenuPreview } from '@/components/AdminMenuPreview';
import { AdminProfessionalLayer } from '@/components/AdminProfessionalLayer';
import { AdminReadableTypography } from '@/components/AdminReadableTypography';
import { requireAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminPage() {
  await requireAdminServerSession();
  return <div className="adminRoot"><AdminReadableTypography /><AdminClient /><AdminDailyTasksPanel /><AdminMenuPreview /><AdminProfessionalLayer /><AdminAttemptResetPanel /></div>;
}
