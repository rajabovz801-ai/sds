import { PlatformNav } from '@/components/PlatformNav';
import { SoonPage } from '@/components/SoonPage';
import { requireStudent } from '@/lib/auth/server-session';

export default async function PracticePage() {
  const student = await requireStudent('/practice');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SoonPage title="Practice" description="Skill bo‘yicha yangi practice kutubxonasi shu ish maydonida ochiladi." features={['IELTS', 'CEFR', 'Reading', 'Listening', 'Writing', 'Speaking']} /></main></div>;
}
