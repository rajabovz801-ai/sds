import { PlatformNav } from '@/components/PlatformNav';
import { SoonPage } from '@/components/SoonPage';
import { requireStudent } from '@/lib/auth/server-session';

export default async function AiTutorPage() {
  const student = await requireStudent('/ai-tutor');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SoonPage title="AI Tutor" description="Writing feedback, speaking practice va shaxsiy study plan uchun AI yordamchi." features={['Writing feedback', 'Speaking coach', 'Study plan', 'Vocabulary']} /></main></div>;
}
