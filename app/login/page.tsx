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
  if (!path?.startsWith('/') || path.startsWith('//')) return '/mock';
  if (path === '/login' || path.startsWith('/api/') || path.startsWith('/admin')) return '/mock';
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
          <span className="authEyebrow"><SparklesIcon /> ARK STUDENT WORKSPACE</span>
          <h2>Diqqatni testga qarating. <em>Qolganini biz boshqaramiz.</em></h2>
          <p>Real imtihon muhiti, saqlanadigan natijalar va barcha IELTS hamda CEFR materiallari bitta ravon ish maydonida.</p>

          <div className="authSteps">
            <div><b><TelegramIcon /></b><span>Kodni oling</span><small>Telegram orqali</small></div>
            <div><b><KeyRoundIcon /></b><span>6 raqam kiriting</span><small>Bir martalik kod</small></div>
            <div><b><LogInIcon /></b><span>Darhol boshlang</span><small>Xavfsiz sessiya</small></div>
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
