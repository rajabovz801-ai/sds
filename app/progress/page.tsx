import { StudentProgressClient } from '@/components/StudentProgressClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getProgressAttempts } from '@/lib/progressAttempts';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const student = await requireStudent('/progress');
  const attempts = await getProgressAttempts(student.id);

  return (
    <StudentWorkspaceShellClient student={student} active="progress">
      <StudentProgressClient attempts={attempts} />
    </StudentWorkspaceShellClient>
  );
}
