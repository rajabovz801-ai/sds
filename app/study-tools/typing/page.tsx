import { SoonPage } from '@/components/SoonPage';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function TypingToolPage() {
  const student = await requireStudent('/study-tools/typing');

  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <SoonPage
        title="Typing Practice"
        description="Typing speed, spelling va accuracy mashqlari shu bo‘limda ishlaydi."
        features={['Typing speed', 'Accuracy', 'Spelling', 'Timed practice']}
      />
    </StudentWorkspaceShellClient>
  );
}
