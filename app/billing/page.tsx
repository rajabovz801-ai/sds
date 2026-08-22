import { PlatformNav } from '@/components/PlatformNav';
import { SoonPage } from '@/components/SoonPage';
import { requireStudent } from '@/lib/auth/server-session';

export default async function BillingPage() {
  const student = await requireStudent('/billing');
  return <div className="platformRoot"><PlatformNav student={student} /><main className="platformMain"><SoonPage title="Billing" description="Subscription, payment history va plan boshqaruvi shu ish maydonida ishlaydi." features={['Plans', 'Payments', 'Invoices', 'Access']} /></main></div>;
}
