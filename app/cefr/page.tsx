import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';

export default async function CefrPage() {
  const student = await requireStudent('/cefr');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><ExamSectionsClient track="cefr" /></main></div>;
}
