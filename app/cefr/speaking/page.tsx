import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';

export default async function CefrSpeakingPage() {
  const student = await requireStudent('/cefr/speaking');
  const tests = await listPublishedTestsByWithAttempts('cefr', 'speaking', student.id);

  return (
    <StudentWorkspaceShellClient student={student} active="cefr">
      <SkillLibraryClient
        track="cefr" skill="speaking" title="CEFR Speaking"
        description="Daraja asosidagi speaking topshiriqlari va professional CEFR practice materiallari."
        tests={tests}
        variant="sidebar"
      />
    </StudentWorkspaceShellClient>
  );
}
