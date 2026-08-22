import { SkillLibraryClient } from '@/components/SkillLibraryClient';

export default function CefrSpeakingPage() {
  return (
    <SkillLibraryClient
      track="cefr"
      skill="speaking"
      title="CEFR Speaking"
      description="CEFR Speaking uchun yangi practice, mock va video materiallar shu bo‘limga qo‘shiladi."
    />
  );
}
