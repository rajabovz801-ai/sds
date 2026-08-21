import { TrackPage } from '@/components/TrackPage';
import { mockSets } from '@/data/programs';

export default function IeltsPage() {
  return (
    <TrackPage
      track="ielts"
      title="IELTS Mock Platform"
      subtitle="Reading, Listening, Writing va Speaking bo‘yicha exam-style practice va full mock testlar."
      mocks={mockSets.ielts}
    />
  );
}
