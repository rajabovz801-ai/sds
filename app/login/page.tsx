import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { LoginClient } from '@/components/LoginClient';

export default function LoginPage() {
  return (
    <div className="authRoot">
      <header className="authTopbar">
        <Brand />
        <Link href="/" className="authBack">Bosh sahifa</Link>
      </header>

      <main className="authMain">
        <section className="authIntro">
          <span className="authEyebrow">ARK IDENTITY</span>
          <h2>Bitta kod. Xavfsiz session. Toza exam flow.</h2>
          <p>Ro‘yxatdan o‘tish va kirish Telegram orqali boshqariladi. Platformada esa testlar, mocklar va natijalar bir student profiliga bog‘lanadi.</p>
          <div className="authSteps">
            <div><b>01</b><span>Botni oching</span><small>Platformaga kirish tugmasini bosing.</small></div>
            <div><b>02</b><span>Kodni oling</span><small>Bot bir martalik login code beradi.</small></div>
            <div><b>03</b><span>Platformaga kiring</span><small>Kod ishlatilgach avtomatik bekor bo‘ladi.</small></div>
          </div>
        </section>

        <section className="authCard">
          <LoginClient />
        </section>
      </main>
    </div>
  );
}
