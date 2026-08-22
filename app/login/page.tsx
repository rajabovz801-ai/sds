import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { LoginClient } from '@/components/LoginClient';
import { getServerSession } from '@/lib/auth/server-session';
import { redirect } from 'next/navigation';

function ArrowLeft() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h11" /></svg>;
}

function BotIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" /></svg>;
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></svg>;
}

function LoginIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3" /><path d="M10 12h11M17 8l4 4-4 4" /></svg>;
}

function safeNext(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith('/') && !path.startsWith('//') ? path : '/mock';
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const nextPath = safeNext((await searchParams).next);
  if (await getServerSession()) redirect(nextPath);

  return (
    <div className="authRoot">
      <header className="authTopbar">
        <Brand />
        <Link href="/" className="authBack"><ArrowLeft /> Bosh sahifa</Link>
      </header>

      <main className="authMain">
        <section className="authIntro">
          <span className="authEyebrow"><span /> ARK SECURE IDENTITY</span>
          <h2>Bitta kod.<br /><em>Barcha natijalaringiz.</em></h2>
          <p>Telegram orqali xavfsiz kiring. Mock testlar, amaliyotlar va natijalar bitta student profilida saqlanadi.</p>
          <div className="authSteps">
            <div><b><BotIcon /></b><span>Botni oching</span><small>Telegram botga o‘ting</small></div>
            <div><b><KeyIcon /></b><span>Kodni oling</span><small>Bir martalik xavfsiz kod</small></div>
            <div><b><LoginIcon /></b><span>Kiring</span><small>Shaxsiy profilingiz tayyor</small></div>
          </div>

          <div className="authArtworkWrap" aria-hidden="true">
            <div className="authArtworkGlow" />
            <img src="/assets/ark-login-secure.png" alt="" className="authArtwork" />
            <div className="authTrustChip"><span /> End-to-end secure session</div>
          </div>
        </section>

        <section className="authCard">
          <div className="authCardDecor" aria-hidden="true"><span /><span /><span /></div>
          <LoginClient nextPath={nextPath} />
          <div className="authPrivacy">Protected by ARK secure access • One-time code</div>
        </section>
      </main>
    </div>
  );
}
