import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { getServerSession } from '@/lib/auth/server-session';

function ArrowRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

function Sparkles() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></svg>;
}

function Headphones() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0" /><path d="M18 19c1.1 0 2-.9 2-2v-3h-4v5h2ZM6 19c-1.1 0-2-.9-2-2v-3h4v5H6Z" /></svg>;
}

function BookOpen() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z" /><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z" /></svg>;
}

function Timer() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>;
}

function Chart() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
}

function ShieldCheck() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export default async function HomePage() {
  if (await getServerSession()) redirect('/mock');

  return (
    <div className="peakHeroPage">
      <div className="peakAmbient peakAmbientBlue" aria-hidden="true" />
      <div className="peakAmbient peakAmbientCoral" aria-hidden="true" />

      <header className="peakHeroNavShell">
        <nav className="peakHeroNav">
          <Link href="/" className="peakHeroBrand" aria-label="ARK Education bosh sahifa">
            <span className="peakHeroBrandMark"><ArkLogoIcon /></span>
            <span className="peakHeroBrandCopy"><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
          </Link>

          <div className="peakHeroLinks" aria-label="Asosiy navigatsiya">
            <Link href="/login?next=/ielts">IELTS</Link>
            <Link href="/login?next=/cefr">CEFR</Link>
            <Link href="/login?next=/mock">Mock testlar</Link>
            <Link href="#platform">Imkoniyatlar</Link>
          </div>

          <div className="peakHeroNavActions">
            <Link className="peakHeroSignIn" href="/login">Kirish</Link>
            <Link className="peakHeroSignup" href="/login?next=/mock">Test boshlash <span><ArrowRight /></span></Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="peakHeroMain">
          <div className="peakHeroCopy">
            <div className="peakHeroEyebrow"><Sparkles /> YANGI AVLOD EXAM PLATFORMASI</div>
            <h1>Imtihonga emas, <em>natijaga tayyorlaning.</em></h1>
            <p className="peakHeroLead">Haqiqiy imtihon muhiti, aniq vaqt nazorati va IELTS hamda CEFR uchun tushunarli natija tahlili — barchasi bitta platformada.</p>

            <div className="peakHeroActions">
              <Link href="/login?next=/mock" className="peakHeroPrimary">Mock testni boshlash <b><ArrowRight /></b></Link>
              <Link href="#platform" className="peakHeroSecondary">Platformani ko‘rish</Link>
            </div>

            <div className="peakHeroProof" aria-label="Platforma afzalliklari">
              <div><strong>40</strong><span>savolli real format</span></div>
              <div><strong>IELTS + CEFR</strong><span>bitta profil ichida</span></div>
              <div><strong>24/7</strong><span>istalgan payt practice</span></div>
            </div>
          </div>

          <div className="peakHeroVisual" aria-label="ARK Education exam platformasi">
            <div className="peakVisualGlass">
              <div className="peakVisualTopline"><span><i /> LIVE EXAM ENVIRONMENT</span><b>ARK • 2026</b></div>
              <div className="peakArtworkStage">
                <img className="peakHeroArtwork" src="/assets/ark-hero-premium.png" alt="IELTS va CEFR tayyorgarligini ifodalovchi premium 3D o‘quv jihozlari" />
              </div>
              <div className="peakScoreFloat"><small>TARGET BAND</small><strong>8.0</strong><span>On track</span></div>
              <div className="peakSkillsFloat"><span>Reading</span><i /><span>Listening</span><i /><span>Writing</span><i /><span>Speaking</span></div>
            </div>
          </div>
        </section>

        <section className="peakPlatform" id="platform">
          <div className="peakSectionHeading">
            <span className="peakSectionKicker">PLATFORM INSIDE</span>
            <h2>Har bir bosqich <em>aniq va nazoratda.</em></h2>
            <p>Keraksiz murakkabliksiz: yo‘nalishni tanlang, real formatda ishlang va natijangizni bir qarashda tushuning.</p>
          </div>

          <div className="peakBentoGrid">
            <article className="peakBentoCard peakTrackCard">
              <div className="peakCardIcon"><BookOpen /></div><span className="peakCardLabel">01 • EXAM TRACKS</span>
              <h3>IELTS va CEFR bir joyda</h3><p>Har bir yo‘nalish uchun alohida skill kutubxonasi va real imtihon oqimi.</p>
              <div className="peakTrackPills"><span>IELTS Academic</span><span>CEFR A2–C1</span></div>
            </article>

            <article className="peakBentoCard peakTimerCard">
              <div className="peakCardIcon"><Timer /></div><span className="peakCardLabel">02 • EXAM MODE</span>
              <h3>Vaqtni his qiling</h3><div className="peakTimerDial"><strong>38:42</strong><span>TIME REMAINING</span></div>
            </article>

            <article className="peakBentoCard peakAnalyticsCard">
              <div className="peakCardIcon"><Chart /></div><span className="peakCardLabel">03 • ANALYTICS</span>
              <h3>Natija oddiy ko‘rinishda</h3><p>Skill kesimidagi holat va keyingi qadamlar uchun aniq ko‘rsatkichlar.</p>
              <div className="peakMiniChart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            </article>

            <article className="peakBentoCard peakSecureCard">
              <div className="peakCardIcon"><ShieldCheck /></div><span className="peakCardLabel">04 • SECURE SESSION</span>
              <h3>Bitta kod. Xavfsiz profil.</h3><p>Telegram orqali bir martalik kod bilan kiring. Aktiv session sizni to‘g‘ridan-to‘g‘ri platformaga olib boradi.</p>
              <div className="peakSecureStatus"><span /><strong>Session protection active</strong></div>
            </article>

            <article className="peakBentoCard peakListeningCard">
              <div className="peakCardIcon"><Headphones /></div><span className="peakCardLabel">05 • FOUR SKILLS</span>
              <h3>Bir xil, ravon tajriba</h3>
              <div className="peakSkillRows"><span><b>R</b>Reading<i /></span><span><b>L</b>Listening<i /></span><span><b>W</b>Writing<i /></span><span><b>S</b>Speaking<i /></span></div>
            </article>
          </div>
        </section>

        <section className="peakFinalCta">
          <div><span>READY WHEN YOU ARE</span><h2>Birinchi mock testingizni boshlang.</h2><p>Kod orqali kiring va kerakli imtihon yo‘nalishini tanlang.</p></div>
          <Link href="/login?next=/mock" className="peakHeroPrimary">Platformaga kirish <b><ArrowRight /></b></Link>
        </section>
      </main>
    </div>
  );
}
