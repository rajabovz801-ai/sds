import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function CefrSpeakingPage() {
  await requireServerSession('/cefr/speaking');
  return (
    <SkillLibraryClient
      track="cefr"
      skill="speaking"
      title="CEFR Speaking"
      description="CEFR Speaking uchun yangi practice, mock va video materiallar shu bo‘limga qo‘shiladi."
    />
  );
}
