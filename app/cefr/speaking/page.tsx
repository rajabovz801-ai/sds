import { CefrSpeakingMockCard } from '@/components/CefrSpeakingMockCard';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getCefrSpeakingMock } from '@/lib/cefrSpeaking';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CefrSpeakingPage() {
  const student = await requireStudent('/cefr/speaking');
  const [tests, speakingMock] = await Promise.all([
    listPublishedTestsByWithAttempts('cefr', 'speaking', student.id),
    getCefrSpeakingMock(),
  ]);

  return (
    <StudentWorkspaceShellClient student={student} active="cefr">
      <CefrSpeakingMockCard enabled={speakingMock?.status === 'published' && Boolean(speakingMock?.instruction_video_path)} />
      <SkillLibraryClient
        track="cefr" skill="speaking" title="CEFR Speaking"
        description="Daraja asosidagi speaking topshiriqlari va professional CEFR practice materiallari."
        tests={tests}
        variant="sidebar"
      />
    </StudentWorkspaceShellClient>
  );
}
