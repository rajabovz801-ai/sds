import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function CefrSpeakingPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/cefr/speaking'),
    listPublishedTestsBy('cefr', 'speaking'),
  ]);
  return (
    <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SkillLibraryClient
      track="cefr" skill="speaking" title="CEFR Speaking"
      description="Daraja asosidagi speaking topshiriqlari va professional CEFR practice materiallari."
      tests={tests}
    /></main></div>
  );
}
