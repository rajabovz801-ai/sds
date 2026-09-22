import { redirect } from 'next/navigation';
import { AdminLoginClient } from '@/components/AdminLoginClient';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminLoginPage() {
  if (await getAdminServerSession()) redirect('/admin');
  return (
    <main className="googleAuthScreen">
      <AdminLoginClient />
    </main>
  );
}
