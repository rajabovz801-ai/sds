import { SkillLibraryClient } from '@/components/SkillLibraryClient';

export default function CefrSpeakingPage() {
  return (
    <SkillLibraryClient
      track="cefr"
      skill="speaking"
      title="CEFR Speaking"
      description="Published CEFR Speaking mock va practice materiallari shu bo‘limda ko‘rinadi."
    />
  );
}
