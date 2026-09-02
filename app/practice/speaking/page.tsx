import { CefrSpeakingMockCard } from '@/components/CefrSpeakingMockCard';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getCefrSpeakingMock } from '@/lib/cefrSpeaking';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PracticeSpeakingPage() {
  const student = await requireStudent('/practice/speaking');
  const [tests, speakingMock] = await Promise.all([
    listPublishedTestsByWithAttempts('cefr', 'speaking', student.id),
    getCefrSpeakingMock(),
  ]);
  const speakingMockEnabled = speakingMock?.status === 'published' && Boolean(speakingMock?.instruction_video_path);

  return (
    <StudentWorkspaceShellClient student={student} active="practice">
      <SkillLibraryClient
        track="cefr"
        skill="speaking"
        title="Speaking Practice"
        description="Speaking savollari, vaqtli mashqlar va real formatdagi topshiriqlar orqali ravonlik, aniqlik va javob tuzilishini rivojlantiring."
        tests={tests}
        variant="sidebar"
        specialCard={speakingMockEnabled ? <CefrSpeakingMockCard enabled /> : undefined}
        backHref="/practice"
        backLabel="PRACTICE"
        contextLabel="PRACTICE"
      />
    </StudentWorkspaceShellClient>
  );
}
