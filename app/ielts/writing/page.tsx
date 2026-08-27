import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsWritingPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/writing'),
    listPublishedTestsBy('ielts', 'writing'),
  ]);
  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <SkillLibraryClient
        track="ielts" skill="writing" title="IELTS Writing"
        description="Task 1 va Task 2 uchun professional topshiriqlar hamda boshqariladigan practice oqimi."
        tests={tests}
        variant="sidebar"
      />
    </StudentWorkspaceShellClient>
  );
}
