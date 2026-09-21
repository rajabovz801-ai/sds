import { StudentProgressClient } from '@/components/StudentProgressClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const student = await requireStudent('/progress');
  const data = await getDashboardData(student.id);

  return (
    <StudentWorkspaceShellClient student={student} active="progress">
      <StudentProgressClient data={data} />
    </StudentWorkspaceShellClient>
  );
}
