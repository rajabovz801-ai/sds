import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function IeltsListeningPage() {
  await requireServerSession('/ielts/listening');
  return (
    <SkillLibraryClient
      track="ielts"
      skill="listening"
      title="IELTS Listening"
      description="IELTS Listening uchun yangi mocklar va video materiallar shu bo‘limga qo‘shiladi."
    />
  );
}
