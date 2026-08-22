import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function IeltsWritingPage() {
  await requireServerSession('/ielts/writing');
  return (
    <SkillLibraryClient
      track="ielts"
      skill="writing"
      title="IELTS Writing"
      description="IELTS Writing uchun yangi mocklar va video materiallar shu bo‘limga qo‘shiladi."
    />
  );
}
