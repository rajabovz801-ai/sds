import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsReadingPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/reading'),
    listPublishedTestsBy('ielts', 'reading'),
  ]);
  return (
    <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SkillLibraryClient
      track="ielts" skill="reading" title="IELTS Reading"
      description="Academic matnlar, real savol formatlari va to‘liq vaqt nazoratidagi Reading mocklari."
      tests={tests}
    /></main></div>
  );
}
