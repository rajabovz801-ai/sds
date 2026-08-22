import { PlatformNav } from '@/components/PlatformNav';
import { SoonPage } from '@/components/SoonPage';
import { requireStudent } from '@/lib/auth/server-session';

export default async function LiveChatPage() {
  const student = await requireStudent('/live-chat');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SoonPage title="Live Chat" description="Teacher support va real-time savol-javob moduli shu yerda ochiladi." features={['Teacher support', 'Notifications', 'Attachments', 'History']} /></main></div>;
}
