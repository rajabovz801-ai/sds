import type { CSSProperties } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { LoginClient } from '@/components/LoginClient';
import {
  ArrowLeftIcon,
  BotIcon,
  CheckCircleIcon,
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
            <div><b><BotIcon /></b><span>Botni oching</span><small>Shaxsiy kodni oling</small></div>
            <div><b><KeyRoundIcon /></b><span>Kodni kiriting</span><small>Bir martalik tasdiqlash</small></div>
            <div><b><LogInIcon /></b><span>Darhol boshlang</span><small>Profilingiz saqlanadi</small></div>
          </div>

          <div className="authWorkspacePreview" aria-hidden="true">
            <div className="authPreviewHeader"><span><ShieldCheckIcon /></span><b>Secure exam workspace</b><i><CheckCircleIcon /> Active</i></div>
            <div className="authPreviewBody">
              <div className="authPreviewScore"><small>READINESS</small><strong>82%</strong><span><i /></span></div>
              <div className="authPreviewSkills">
                <span><b>Listening</b><i style={{ '--progress': '88%' } as CSSProperties} /></span>
                <span><b>Reading</b><i style={{ '--progress': '74%' } as CSSProperties} /></span>
                <span><b>Writing</b><i style={{ '--progress': '69%' } as CSSProperties} /></span>
              </div>
            </div>
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
