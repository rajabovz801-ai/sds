import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { AwardIcon, ShieldCheckIcon, TargetIcon, ZapIcon } from '@/components/UiIcons';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

function ArrowRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

export default async function HomePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/ielts');

  return (
    <div className="arkIeltsLanding">
      <header className="arkIeltsHeader">
        <nav className="arkIeltsNav" aria-label="Asosiy navigatsiya">
          <Link href="/" className="arkIeltsBrand" aria-label="ARK Education bosh sahifa">
            <span className="arkIeltsBrandMark"><ArkLogoIcon /></span>
            <span className="arkIeltsBrandText"><strong>ARK Education</strong><small>IELTS EXAM PLATFORM</small></span>
          </Link>
          <div className="arkIeltsNavActions">
            <Link href="/login" className="arkIeltsLogin">Kirish</Link>
            <Link href="/login?next=/ielts" className="arkIeltsNavCta">Testlarni ochish <ArrowRight /></Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="arkIeltsHero">
          <div className="arkIeltsHeroCopy">
            <span className="arkIeltsEyebrow"><i /> REAL EXAM • CAMBRIDGE • GOLD</span>
            <h1>IELTS Reading &amp; Listening.<br /><em>Clean exam practice.</em></h1>
            <p>Reading va Listening testlarini Real Exam, Cambridge va Gold to‘plamlarida ixcham, professional muhitda ishlang.</p>

            <div className="arkIeltsHeroActions">
              <Link href="/login?next=/ielts" className="arkIeltsPrimary">Testlarni boshlash <ArrowRight /></Link>
            </div>

            <div className="arkHeroBenefits" aria-label="Platforma afzalliklari">
              <article><i><TargetIcon /></i><div><small>READING</small><b>Full + 3 parts</b></div></article>
              <article><i><ZapIcon /></i><div><small>LISTENING</small><b>Full + 4 parts</b></div></article>
              <article><i><AwardIcon /></i><div><small>LIBRARY</small><b>3 collections</b></div></article>
            </div>
          </div>

          <div className="arkPracticeVision" aria-label="ARK IELTS test library">
            <div className="arkPracticeTop">
              <span>ARK IELTS</span>
              <strong>Real Exam. Cambridge. Gold.</strong>
              <p>Kerakli collection, skill va partni tanlang — ortiqcha bo‘limlarsiz.</p>
            </div>

            <div className="arkPracticeSteps">
              <article><span className="arkPracticeIcon"><TargetIcon /></span><div><small>01 · CHOOSE</small><h3>Collectionni tanlang.</h3><p>Real Exam, Cambridge yoki Gold.</p></div></article>
              <article><span className="arkPracticeIcon"><ZapIcon /></span><div><small>02 · PRACTICE</small><h3>Reading yoki Listening.</h3><p>Full test yoki kerakli part.</p></div></article>
              <article><span className="arkPracticeIcon"><AwardIcon /></span><div><small>03 · COMPLETE</small><h3>Testni yakunlang.</h3><p>Toza exam workflow.</p></div></article>
            </div>

            <div className="arkPracticeSecure">
              <span><ShieldCheckIcon /></span>
              <div><small>ARK EDUCATION</small><strong>IELTS test platform.</strong></div>
              <b>ARK</b>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
