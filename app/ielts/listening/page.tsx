import { IeltsTestScopeFilter } from '@/components/IeltsTestScopeFilter';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';

export default async function IeltsListeningPage() {
  const student = await requireStudent('/ielts/listening');
  const tests = await listPublishedTestsByWithAttempts('ielts', 'listening', student.id);

  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <SkillLibraryClient
        track="ielts" skill="listening" title="IELTS Listening"
        description="Audio asosidagi real mocklar va vaqt nazoratidagi Listening materiallari."
        tests={tests}
        variant="sidebar"
      />
      <IeltsTestScopeFilter skill="listening" tests={tests.map((test) => ({ id: test.id, testScope: test.testScope || null }))} />
    </StudentWorkspaceShellClient>
  );
}
