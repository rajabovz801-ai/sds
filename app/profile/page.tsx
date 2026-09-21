import { StudentProfilePageClient } from '@/components/StudentProfilePageClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getDashboardData } from '@/lib/dashboard';
import { getStudentAccountInfo } from '@/lib/studentAccount';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const student = await requireStudent('/profile');
  const [account, dashboard] = await Promise.all([
    getStudentAccountInfo(student.id),
    getDashboardData(student.id),
  ]);

  return (
    <StudentWorkspaceShellClient student={student} active="profile">
      <StudentProfilePageClient student={student} account={account} targetBand={dashboard.nextTargetBand} />
    </StudentWorkspaceShellClient>
  );
}
