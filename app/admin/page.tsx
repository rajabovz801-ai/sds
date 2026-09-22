import { AdminClient } from '@/components/AdminClient';
import { AdminLargeHtmlUploadBridge } from '@/components/AdminLargeHtmlUploadBridge';
import { requireAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminPage() {
  await requireAdminServerSession();
  return (
    <div className="adminRoot">
      <AdminLargeHtmlUploadBridge />
      <AdminClient />
    </div>
  );
}
