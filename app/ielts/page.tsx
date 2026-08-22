import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';

export default async function IeltsPage() {
  const student = await requireStudent('/ielts');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><ExamSectionsClient track="ielts" /></main></div>;
}
