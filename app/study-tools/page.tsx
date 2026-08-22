import { PlatformNav } from '@/components/PlatformNav';
import { SoonPage } from '@/components/SoonPage';
import { requireStudent } from '@/lib/auth/server-session';

export default async function StudyToolsPage() {
  const student = await requireStudent('/study-tools');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SoonPage title="Study tools" description="Articles, shadowing, typing, writing samples va podcastlar shu bo‘limda ishlaydi." features={['Articles', 'Shadowing', 'Typing', 'Samples', 'Podcasts']} /></main></div>;
}
