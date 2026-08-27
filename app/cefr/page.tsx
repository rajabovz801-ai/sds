import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function CefrPage() {
  const student = await requireStudent('/cefr');
  return (
    <StudentWorkspaceShellClient student={student} active="cefr">
      <ExamSectionsClient track="cefr" />
    </StudentWorkspaceShellClient>
  );
}
