import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { LoginClient } from '@/components/LoginClient';
import {
  ArrowLeftIcon,
  TelegramIcon,
  KeyRoundIcon,
  LogInIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';
import { getActiveServerSession } from '@/lib/auth/server-session';

function safeNext(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path?.startsWith('/') || path.startsWith('//')) return '/ielts';
  if (path === '/login' || path.startsWith('/api/') || path.startsWith('/admin')) return '/ielts';
  return path;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const nextPath = safeNext((await searchParams).next);
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect(nextPath);

  return (
    <div className="authRoot">
      <header className="authTopbar">
        <Brand />
        <Link href="/" className="authBack"><ArrowLeftIcon /> Bosh sahifa</Link>
      </header>

      <main className="authMain">
        <section className="authIntro">
          <span className="authEyebrow"><SparklesIcon /> ARK IELTS TEST PLATFORM</span>
          <h2>Reading va Listening. <em>Faqat kerakli testlar.</em></h2>
          <p>Real Exam, Cambridge va Gold collectionlari bitta ixcham IELTS test workspace ichida.</p>

          <div className="authSteps">
            <div><b><TelegramIcon /></b><span>Kodni oling</span><small>Telegram orqali</small></div>
            <div><b><KeyRoundIcon /></b><span>6 raqam kiriting</span><small>Bir martalik kod</small></div>
            <div><b><LogInIcon /></b><span>Testlarni oching</span><small>Reading &amp; Listening</small></div>
          </div>
        </section>

        <section className="authCard">
          <div className="authCardDecor" aria-hidden="true"><span /><span /><span /></div>
          <LoginClient nextPath={nextPath} />
          <div className="authPrivacy"><ShieldCheckIcon /> Server tomonidan himoyalangan sessiya</div>
        </section>
      </main>
    </div>
  );
}
