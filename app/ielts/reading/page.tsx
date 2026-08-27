import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsReadingPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/reading'),
    listPublishedTestsBy('ielts', 'reading'),
  ]);
  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <SkillLibraryClient
        track="ielts" skill="reading" title="IELTS Reading"
        description="Academic matnlar, real savol formatlari va to‘liq vaqt nazoratidagi Reading mocklari."
        tests={tests}
        variant="sidebar"
      />
    </StudentWorkspaceShellClient>
  );
}
