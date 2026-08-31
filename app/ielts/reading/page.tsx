import { IeltsTestScopeFilter } from '@/components/IeltsTestScopeFilter';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';

export default async function IeltsReadingPage() {
  const student = await requireStudent('/ielts/reading');
  const tests = await listPublishedTestsByWithAttempts('ielts', 'reading', student.id);

  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <SkillLibraryClient
        track="ielts" skill="reading" title="IELTS Reading"
        description="Academic matnlar, real savol formatlari va to‘liq vaqt nazoratidagi Reading mocklari."
        tests={tests}
        variant="sidebar"
      />
      <IeltsTestScopeFilter skill="reading" tests={tests.map((test) => ({ id: test.id, testScope: test.testScope }))} />
    </StudentWorkspaceShellClient>
  );
}
