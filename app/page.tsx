import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

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

function PenNib() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-9 9-7 1 1-7 9-9Z" /><path d="m12 6 6 6M4 20l6-6" /></svg>;
}

function Microphone() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>;
}

export default async function HomePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/mock');

  return (
    <div className="peakHeroPage">
      <div className="peakAmbient peakAmbientBlue" aria-hidden="true" />
      <div className="peakAmbient peakAmbientCoral" aria-hidden="true" />

      <header className="peakHeroNavShell">
        <nav className="peakHeroNav">
          <Link href="/" className="peakHeroBrand" aria-label="ARK Education bosh sahifa">
            <span className="peakHeroBrandMark"><ArkLogoIcon /></span>
            <span className="peakHeroBrandCopy"><strong>ARK Education</strong><small>IELTS &amp; CEFR IMTIHON PLATFORMASI</small></span>
          </Link>

          <div className="peakHeroLinks" aria-label="Asosiy navigatsiya">
            <Link href="/login?next=/ielts">IELTS</Link>
            <Link href="/login?next=/cefr">CEFR</Link>
            <Link href="#skills">4 Skills</Link>
            <Link href="/login?next=/mock">Mock testlar</Link>
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
            <div className="peakHeroEyebrow"><Sparkles /> ARK EDUCATION PLATFORM • IELTS &amp; CEFR</div>
            <h1>Real exam.<br />Real progress.<br /><em>Real results.</em></h1>
            <p className="peakHeroLead">ARK Education Platform — IELTS va CEFR uchun haqiqiy imtihon muhiti, aniq vaqt nazorati, professional practice va tushunarli natija tahlili bitta premium platformada.</p>

            <div className="peakHeroActions">
              <Link href="/login?next=/mock" className="peakHeroPrimary">Mock testni boshlash <b><ArrowRight /></b></Link>
              <Link href="#skills" className="peakHeroSecondary">4 skillni ko‘rish</Link>
            </div>

            <div className="peakHeroProof" aria-label="Platforma afzalliklari">
              <div><strong>4 Skills</strong><span>Reading • Listening • Writing • Speaking</span></div>
              <div><strong>IELTS + CEFR</strong><span>bitta profil ichida</span></div>
              <div><strong>24/7</strong><span>istalgan payt mashq</span></div>
            </div>
          </div>

          <div className="peakHeroVisual" aria-label="ARK Education imtihon platformasi">
            <div className="peakVisualGlass">
              <div className="peakArtworkStage">
                <Image
                  className="peakHeroArtwork"
                  src="/assets/ark-hero-cream.png"
                  alt="IELTS va CEFR tayyorgarligini ifodalovchi premium 3D o‘quv jihozlari"
                  width={1200}
                  height={800}
                  sizes="(max-width: 720px) 108vw, (max-width: 1180px) 92vw, 58vw"
                  priority
                />
              </div>
              <div className="peakScoreFloat"><small>MAQSAD BANDI</small><strong>8.0</strong><span>Reja bo‘yicha</span></div>
              <div className="peakSkillsFloat"><span>Reading</span><i /><span>Listening</span><i /><span>Writing</span><i /><span>Speaking</span></div>
            </div>
          </div>
        </section>

        <section className="peakSkillsSimple" id="skills">
          <div className="peakSkillsSimpleHead">
            <div>
              <span>IELTS • 4 SKILLS</span>
              <h2>Everything you need to <em>practice IELTS.</em></h2>
            </div>
            <p>To‘rtta asosiy ko‘nikma bitta toza va professional platformada.</p>
          </div>

          <div className="peakSkillsSimpleGrid">
            <article className="peakSkillSimpleCard peakSkillSimpleReading">
              <span className="peakSkillSimpleIcon"><BookOpen /></span>
              <div><small>01</small><h3>Reading</h3><p>Passage, highlight va review bilan real test formatida mashq qiling.</p></div>
            </article>

            <article className="peakSkillSimpleCard peakSkillSimpleListening">
              <span className="peakSkillSimpleIcon"><Headphones /></span>
              <div><small>02</small><h3>Listening</h3><p>4 part va tartibli navigation bilan haqiqiy test ritmini his qiling.</p></div>
            </article>

            <article className="peakSkillSimpleCard peakSkillSimpleWriting">
              <span className="peakSkillSimpleIcon"><PenNib /></span>
              <div><small>03</small><h3>Writing</h3><p>Task 1 va Task 2 topshiriqlarini sodda, fokuslangan yozish muhitida bajaring.</p></div>
            </article>

            <article className="peakSkillSimpleCard peakSkillSimpleSpeaking">
              <span className="peakSkillSimpleIcon"><Microphone /></span>
              <div><small>04</small><h3>Speaking</h3><p>Part 1–3 bo‘yicha tartibli speaking practice va javoblar tarixini boshqaring.</p></div>
            </article>
          </div>
        </section>

        <section className="peakFinalCta">
          <div><span>BOSHLASHGA TAYYORMISIZ?</span><h2>Birinchi mock testingizni boshlang.</h2><p>Kod orqali kiring va kerakli imtihon yo‘nalishini tanlang.</p></div>
          <Link href="/login?next=/mock" className="peakHeroPrimary">Platformaga kirish <b><ArrowRight /></b></Link>
        </section>
      </main>

      <footer
        className="peakHeroNavShell"
        aria-label="ARK Education Platform footer"
        style={{ position: 'relative', top: 'auto', marginTop: 20, paddingTop: 18, paddingBottom: 22, borderTop: '1px solid rgba(30,45,69,.07)', borderBottom: 0, background: 'transparent' }}
      >
        <div className="peakHeroNav" style={{ minHeight: 78 }}>
          <Link href="/" className="peakHeroBrand" aria-label="ARK Education Platform">
            <span className="peakHeroBrandMark"><ArkLogoIcon /></span>
            <span className="peakHeroBrandCopy"><strong>ARK Education</strong><small>PREMIUM EXAM PLATFORM</small></span>
          </Link>

          <p style={{ margin: 0, justifySelf: 'center', color: '#788292', fontSize: 11, fontWeight: 650, letterSpacing: '.01em', textAlign: 'center' }}>
            © 2026 ARK Education Platform. All information reserved.
          </p>

          <span className="peakHeroSignIn" style={{ pointerEvents: 'none', whiteSpace: 'nowrap', color: '#7b8493', fontSize: 10, letterSpacing: '.1em' }}>
            IELTS • CEFR • MOCK
          </span>
        </div>
      </footer>
    </div>
  );
}
