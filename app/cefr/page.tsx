import { TrackPage } from '@/components/TrackPage';
import { mockSets } from '@/data/programs';

export default function CefrPage() {
  return (
    <TrackPage
      track="cefr"
      title="CEFR Mock Platform"
      subtitle="A2 dan C1 gacha daraja bo‘yicha practice, full mock testlar va aniq progress nazorati."
      mocks={mockSets.cefr}
    />
  );
}
