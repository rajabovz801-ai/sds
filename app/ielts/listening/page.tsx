import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsListeningPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/listening'),
    listPublishedTestsBy('ielts', 'listening'),
  ]);
  return (
    <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SkillLibraryClient
      track="ielts" skill="listening" title="IELTS Listening"
      description="Audio asosidagi real mocklar va vaqt nazoratidagi Listening materiallari."
      tests={tests}
    /></main></div>
  );
}
