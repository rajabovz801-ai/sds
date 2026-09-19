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
  if (await getActiveServerSession()) redirect('/mock');

  return (
    <div className="arkIeltsLanding">
      <header className="arkIeltsHeader">
        <nav className="arkIeltsNav" aria-label="Asosiy navigatsiya">
          <Link href="/" className="arkIeltsBrand" aria-label="ARK Education bosh sahifa">
            <span className="arkIeltsBrandMark"><ArkLogoIcon /></span>
            <span className="arkIeltsBrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
          </Link>
          <div className="arkIeltsNavActions">
            <Link href="/login" className="arkIeltsLogin">Kirish</Link>
            <Link href="/login?next=/mock" className="arkIeltsNavCta">Mock boshlash <ArrowRight /></Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="arkIeltsHero">
          <div className="arkIeltsHeroCopy">
            <span className="arkIeltsEyebrow"><i /> IELTS • CEFR • FULL MOCK</span>
            <h1>Real IELTS practice.<br /><em>Real exam experience.</em></h1>
            <p>Reading, Listening, Writing va Speaking’ni haqiqiy imtihonga yaqin muhitda mashq qiling. Testni bajaring, natijani ko‘ring va keyingi urinishda aynan nimani yaxshilash kerakligini biling.</p>

            <div className="arkIeltsHeroActions">
              <Link href="/login?next=/mock" className="arkIeltsPrimary">IELTS Mock boshlash <ArrowRight /></Link>
            </div>

            <div className="arkHeroBenefits" aria-label="Platforma afzalliklari">
              <article><i><TargetIcon /></i><div><small>EXAM FLOW</small><b>Real exam format</b></div></article>
              <article><i><ShieldCheckIcon /></i><div><small>SECURE</small><b>Autosaved session</b></div></article>
              <article><i><AwardIcon /></i><div><small>RESULTS</small><b>Clear progress</b></div></article>
            </div>
          </div>

          <div className="arkPracticeVision" aria-label="ARK Education practice philosophy">
            <div className="arkPracticeTop">
              <span>ARK METHOD</span>
              <strong>Practice. Progress. Achieve.</strong>
              <p>Mashq qiling, progressni ko‘ring va keyingi bosqichga o‘ting.</p>
            </div>

            <div className="arkPracticeSteps">
              <article>
                <span className="arkPracticeIcon"><ZapIcon /></span>
                <div><small>01 · PRACTICE</small><h3>Real formatda mashq qiling.</h3><p>Real exam formatida.</p></div>
              </article>
              <article>
                <span className="arkPracticeIcon"><TargetIcon /></span>
                <div><small>02 · PROGRESS</small><h3>Natijani kuzating.</h3><p>Natijalar dashboardda.</p></div>
              </article>
              <article>
                <span className="arkPracticeIcon"><AwardIcon /></span>
                <div><small>03 · ACHIEVE</small><h3>Keyingi darajaga chiqing.</h3><p>Keyingi maqsadni aniqlang.</p></div>
              </article>
            </div>

            <div className="arkPracticeSecure">
              <span><ShieldCheckIcon /></span>
              <div><small>SECURE EXAM PLATFORM</small><strong>One account. One progress history.</strong></div>
              <b>ARK</b>
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}
