import { SoonPage } from '@/components/SoonPage';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function PracticePage() {
  const student = await requireStudent('/practice');
  return (
    <StudentWorkspaceShellClient student={student} active="practice">
      <SoonPage
        title="Practice"
        description="Skill bo‘yicha yangi practice kutubxonasi shu ish maydonida ochiladi."
        features={['IELTS', 'CEFR', 'Reading', 'Listening', 'Writing', 'Speaking']}
      />
    </StudentWorkspaceShellClient>
  );
}
