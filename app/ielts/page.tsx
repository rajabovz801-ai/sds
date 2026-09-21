import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { TestsHubClient } from '@/components/TestsHubClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTests } from '@/lib/cloudTests';

export const dynamic = 'force-dynamic';

export default async function IeltsPage() {
  const student = await requireStudent('/ielts');
  const tests = (await listPublishedTests()).filter((test) => test.track === 'ielts');

  return (
    <StudentWorkspaceShellClient student={student} active="tests">
      <TestsHubClient tests={tests} />
    </StudentWorkspaceShellClient>
  );
}
