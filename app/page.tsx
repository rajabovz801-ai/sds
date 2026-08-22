import Link from 'next/link';
import { LandingAccessCard } from '@/components/LandingAccessCard';

function ArkSymbol() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M13.5 35.5 24 10l10.5 25.5" />
      <path d="M17 28.5h14" />
      <path d="M10 36.5h28" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function ShieldCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Sparkles() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="peakHeroPage">
      <div className="peakAmbient peakAmbientBlue" aria-hidden="true" />
      <div className="peakAmbient peakAmbientCoral" aria-hidden="true" />

      <header className="peakHeroNavShell">
        <nav className="peakHeroNav">
          <Link href="/" className="peakHeroBrand" aria-label="ARK Education bosh sahifa">
            <span className="peakHeroBrandMark"><ArkSymbol /></span>
            <span className="peakHeroBrandCopy">
              <strong>ARK Education</strong>
              <small>IELTS &amp; CEFR EXAM PLATFORM</small>
            </span>
          </Link>

          <div className="peakHeroLinks" aria-label="Asosiy navigatsiya">
            <Link href="/ielts">IELTS</Link>
            <Link href="/cefr">CEFR</Link>
            <Link href="/mock">Mock testlar</Link>
            <Link href="/dashboard">Natijalar</Link>
          </div>

          <div className="peakHeroNavActions">
            <Link className="peakHeroSignIn" href="/login">Kirish</Link>
            <Link className="peakHeroSignup" href="/mock">
              Test boshlash <span><ArrowRight /></span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="peakHeroMain">
        <section className="peakHeroCopy">
          <div className="peakHeroEyebrow"><Sparkles /> YANGI AVLOD EXAM PLATFORMASI</div>
          <h1>Natijaga olib boradigan <em>aniq tayyorgarlik.</em></h1>
          <p className="peakHeroLead">
            Haqiqiy imtihon muhiti, ishonchli natijalar va IELTS hamda CEFR uchun bitta professional platforma.
          </p>

          <div className="peakHeroActions">
            <Link href="/mock" className="peakHeroPrimary">
              Mock testni boshlash <b><ArrowRight /></b>
            </Link>
            <Link href="/ielts" className="peakHeroSecondary">Platformani ko‘rish</Link>
          </div>

          <div className="peakHeroProof" aria-label="Platforma afzalliklari">
            <div><strong>40</strong><span>savolli real format</span></div>
            <div><strong>IELTS + CEFR</strong><span>bitta profil ichida</span></div>
            <div><strong><ShieldCheck /></strong><span>xavfsiz session</span></div>
          </div>
        </section>

        <section className="peakHeroVisual" aria-label="ARK Education exam platformasi">
          <div className="peakVisualGlass" aria-hidden="true">
            <div className="peakVisualTopline">
              <span><i /> LIVE EXAM ENVIRONMENT</span>
              <b>ARK • 2026</b>
            </div>
            <img
              className="peakHeroArtwork"
              src="/assets/ark-hero-premium.png"
              alt="IELTS va CEFR tayyorgarligini ifodalovchi premium 3D o‘quv jihozlari"
            />
            <div className="peakScoreFloat">
              <small>TARGET BAND</small>
              <strong>8.0</strong>
              <span>On track</span>
            </div>
            <div className="peakSkillsFloat">
              <span>Reading</span><i />
              <span>Listening</span><i />
              <span>Writing</span><i />
              <span>Speaking</span>
            </div>
          </div>
        </section>

        <section className="peakHeroAccess" id="access" aria-label="Platformaga tezkor kirish">
          <div className="peakAccessHeading">
            <span><ShieldCheck /></span>
            <div><strong>Tezkor kirish</strong><small>Telegram bot bergan bir martalik kod bilan</small></div>
          </div>
          <div className="peakAccessBody"><LandingAccessCard /></div>
        </section>
      </main>
    </div>
  );
}
