import { SoonPage } from '@/components/SoonPage';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function StudyToolsPage() {
  const student = await requireStudent('/study-tools');
  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <SoonPage
        title="Study tools"
        description="Articles, shadowing, typing, writing samples va podcastlar shu bo‘limda ishlaydi."
        features={['Articles', 'Shadowing', 'Typing', 'Samples', 'Podcasts']}
      />
    </StudentWorkspaceShellClient>
  );
}
