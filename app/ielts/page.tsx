import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function IeltsPage() {
  const student = await requireStudent('/ielts');
  return (
    <StudentWorkspaceShellClient student={student} active="ielts">
      <ExamSectionsClient track="ielts" />
    </StudentWorkspaceShellClient>
  );
}
