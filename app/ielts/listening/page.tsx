import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsListeningPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/listening'),
    listPublishedTestsBy('ielts', 'listening'),
  ]);
  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <SkillLibraryClient
        track="ielts" skill="listening" title="IELTS Listening"
        description="Audio asosidagi real mocklar va vaqt nazoratidagi Listening materiallari."
        tests={tests}
        variant="sidebar"
      />
    </StudentWorkspaceShellClient>
  );
}
