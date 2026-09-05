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

        <section className="peakPlatform" id="platform">
          <div className="peakSectionHeading">
            <span className="peakSectionKicker">PLATFORMA IMKONIYATLARI</span>
            <h2>Har bir bosqich <em>aniq va nazoratda.</em></h2>
            <p>Keraksiz murakkabliksiz: yo‘nalishni tanlang, real formatda ishlang va natijangizni bir qarashda tushuning.</p>
          </div>

          <div className="peakBentoGrid">
            <article className="peakBentoCard peakTrackCard">
              <div className="peakCardIcon"><BookOpen /></div><span className="peakCardLabel">01 • IMTIHON YO‘NALISHLARI</span>
              <h3>IELTS va CEFR bir joyda</h3><p>Har bir yo‘nalish uchun alohida ko‘nikma kutubxonasi va real imtihon oqimi.</p>
              <div className="peakTrackPills"><span>IELTS Academic</span><span>CEFR A2–C1</span></div>
            </article>

            <article className="peakBentoCard peakTimerCard">
              <div className="peakCardIcon"><Timer /></div><span className="peakCardLabel">02 • IMTIHON REJIMI</span>
              <h3>Vaqtni his qiling</h3><div className="peakTimerDial"><strong>38:42</strong><span>QOLGAN VAQT</span></div>
            </article>

            <article className="peakBentoCard peakAnalyticsCard">
              <div className="peakCardIcon"><Chart /></div><span className="peakCardLabel">03 • TAHLIL</span>
              <h3>Natija oddiy ko‘rinishda</h3><p>Ko‘nikmalar kesimidagi holat va keyingi qadamlar uchun aniq ko‘rsatkichlar.</p>
              <div className="peakMiniChart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
            </article>

            <article className="peakBentoCard peakSecureCard">
              <div className="peakCardIcon"><ShieldCheck /></div><span className="peakCardLabel">04 • XAVFSIZ SESSIYA</span>
              <h3>Bitta kod. Xavfsiz profil.</h3><p>Telegram orqali bir martalik kod bilan kiring. Faol sessiya sizni to‘g‘ridan-to‘g‘ri platformaga olib boradi.</p>
              <div className="peakSecureStatus"><span /><strong>Sessiya himoyasi faol</strong></div>
            </article>

            <article className="peakBentoCard peakListeningCard">
              <div className="peakCardIcon"><Headphones /></div><span className="peakCardLabel">05 • TO‘RT KO‘NIKMA</span>
              <h3>Bir xil, ravon tajriba</h3>
              <div className="peakSkillRows"><span><b>R</b> Reading<i /></span><span><b>L</b> Listening<i /></span><span><b>W</b> Writing<i /></span><span><b>S</b> Speaking<i /></span></div>
            </article>
          </div>
        </section>

        <section className="peakSkillsShowcase" id="skills">
          <div className="peakSectionHeading">
            <span className="peakSectionKicker">4 SKILLS • ONE PLATFORM</span>
            <h2>Har bir skill uchun <em>professional muhit.</em></h2>
            <p>Reading, Listening, Writing va Speaking alohida tajribaga ega, lekin barchasi bitta ARK dizayn tizimi va progress oqimida ishlaydi.</p>
          </div>

          <div className="peakSkillShowcaseGrid">
            <article className="peakSkillShowcaseCard peakSkillReading">
              <div className="peakSkillShowcaseCopy">
                <div className="peakSkillShowcaseTop"><span className="peakSkillShowcaseIcon"><BookOpen /></span><span className="peakSkillShowcaseIndex">01 • READING</span></div>
                <h3>Reading</h3>
                <p>Passage va savollarni qulay boshqaring, highlight qiling va real imtihondagidek navigation bilan ishlang.</p>
                <div className="peakSkillTags"><span>Passage view</span><span>Highlight</span><span>Review</span></div>
              </div>
              <div className="peakSkillVisualFrame" aria-hidden="true">
                <Image className="peakSkillPng" src="/assets/ark-hero-premium.png" alt="" width={780} height={560} sizes="(max-width:720px) 85vw, 28vw" />
                <span className="peakSkillVisualBadge"><BookOpen /></span>
                <div className="peakSkillVisualCard"><div className="peakSkillVisualCardTop"><span>PASSAGE 01</span><span>ACTIVE</span></div><div className="peakSkillVisualLines"><i /><i /><i /></div></div>
              </div>
            </article>

            <article className="peakSkillShowcaseCard peakSkillListening">
              <div className="peakSkillShowcaseCopy">
                <div className="peakSkillShowcaseTop"><span className="peakSkillShowcaseIcon"><Headphones /></span><span className="peakSkillShowcaseIndex">02 • LISTENING</span></div>
                <h3>Listening</h3>
                <p>Audio oqimi, part navigation va savollar bir ekranda — diqqatni bo‘lmasdan real test ritmida ishlash uchun.</p>
                <div className="peakSkillTags"><span>4 Parts</span><span>Audio flow</span><span>Auto save</span></div>
              </div>
              <div className="peakSkillVisualFrame" aria-hidden="true">
                <Image className="peakSkillPng" src="/assets/ark-hero-cream.png" alt="" width={780} height={560} sizes="(max-width:720px) 85vw, 28vw" />
                <span className="peakSkillVisualBadge"><Headphones /></span>
                <div className="peakSkillVisualCard"><div className="peakSkillVisualCardTop"><span>LISTENING • PART 2</span><span>PLAYING</span></div><div className="peakSkillVisualLines"><i /><i /><i /></div></div>
              </div>
            </article>

            <article className="peakSkillShowcaseCard peakSkillWriting">
              <div className="peakSkillShowcaseCopy">
                <div className="peakSkillShowcaseTop"><span className="peakSkillShowcaseIcon"><PenNib /></span><span className="peakSkillShowcaseIndex">03 • WRITING</span></div>
                <h3>Writing</h3>
                <p>Task 1 va Task 2 uchun toza yozish maydoni, vaqt nazorati va submission tarixini professional ko‘rinishda boshqaring.</p>
                <div className="peakSkillTags"><span>Task 1</span><span>Task 2</span><span>Submission</span></div>
              </div>
              <div className="peakSkillVisualFrame" aria-hidden="true">
                <Image className="peakSkillPng" src="/assets/ark-login-secure.png" alt="" width={780} height={560} sizes="(max-width:720px) 85vw, 28vw" />
                <span className="peakSkillVisualBadge"><PenNib /></span>
                <div className="peakSkillVisualCard"><div className="peakSkillVisualCardTop"><span>WRITING • TASK 2</span><span>SAVED</span></div><div className="peakSkillVisualLines"><i /><i /><i /></div></div>
              </div>
            </article>

            <article className="peakSkillShowcaseCard peakSkillSpeaking">
              <div className="peakSkillShowcaseCopy">
                <div className="peakSkillShowcaseTop"><span className="peakSkillShowcaseIcon"><Microphone /></span><span className="peakSkillShowcaseIndex">04 • SPEAKING</span></div>
                <h3>Speaking</h3>
                <p>Part 1–3 savollari, tayyorlanish va javob berish oqimi orqali speaking practice’ni aniq va tartibli bajaring.</p>
                <div className="peakSkillTags"><span>Part 1–3</span><span>Practice</span><span>History</span></div>
              </div>
              <div className="peakSkillVisualFrame" aria-hidden="true">
                <Image className="peakSkillPng" src="/assets/ark-hero-premium.png" alt="" width={780} height={560} sizes="(max-width:720px) 85vw, 28vw" />
                <span className="peakSkillVisualBadge"><Microphone /></span>
                <div className="peakSkillVisualCard"><div className="peakSkillVisualCardTop"><span>SPEAKING • PART 2</span><span>READY</span></div><div className="peakSkillVisualLines"><i /><i /><i /></div></div>
              </div>
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
