import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function IeltsReadingPage() {
  await requireServerSession('/ielts/reading');
  return (
    <SkillLibraryClient
      track="ielts"
      skill="reading"
      title="IELTS Reading"
      description="IELTS Academic Reading uchun yangi mocklar va video materiallar shu bo‘limga qo‘shiladi."
    />
  );
}
