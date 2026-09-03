import { SoonPage } from '@/components/SoonPage';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function ShadowingToolPage() {
  const student = await requireStudent('/study-tools/shadowing');

  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <SoonPage
        title="Shadowing Practice"
        description="Audio ortidan takrorlash, pronunciation, rhythm va fluency mashqlari shu bo‘limda ishlaydi."
        features={['Pronunciation', 'Listening', 'Rhythm', 'Fluency']}
      />
    </StudentWorkspaceShellClient>
  );
}
