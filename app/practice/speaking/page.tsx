import { SpeakingAutoSubmitBridge } from '@/components/SpeakingAutoSubmitBridge';
import { SpeakingPracticeClient } from '@/components/SpeakingPracticeClient';
import { SpeakingProgressBridge } from '@/components/SpeakingProgressBridge';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PracticeSpeakingPage() {
  const student = await requireStudent('/practice/speaking');
  const studentName = `${student.firstName} ${student.lastName}`.replace(/\s+/g, ' ').trim();

  return (
    <StudentWorkspaceShellClient student={student} active="practice">
      <SpeakingAutoSubmitBridge />
      <SpeakingProgressBridge studentId={student.id} />
      <SpeakingPracticeClient studentName={studentName} />
    </StudentWorkspaceShellClient>
  );
}
