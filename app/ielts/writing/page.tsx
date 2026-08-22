import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsBy } from '@/lib/cloudTests';

export default async function IeltsWritingPage() {
  const [student, tests] = await Promise.all([
    requireStudent('/ielts/writing'),
    listPublishedTestsBy('ielts', 'writing'),
  ]);
  return (
    <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SkillLibraryClient
      track="ielts" skill="writing" title="IELTS Writing"
      description="Task 1 va Task 2 uchun professional topshiriqlar hamda boshqariladigan practice oqimi."
      tests={tests}
    /></main></div>
  );
}
