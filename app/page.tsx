import Link from 'next/link';
import { Header } from '@/components/Header';
import { LandingMotion } from '@/components/LandingMotion';

const skills = ['Reading', 'Listening', 'Writing', 'Speaking'];

export default function HomePage() {
  return (
    <div className="arkLanding">
      <LandingMotion />
      <Header />

      <main>
        <section className="arkHero" id="platform">
          <div className="heroGlow heroGlowOne" aria-hidden="true" />
          <div className="heroGlow heroGlowTwo" aria-hidden="true" />
          <div className="landingShell arkHeroGrid">
            <div className="arkHeroCopy" data-reveal="up">
              <div className="arkHeroBadge"><span /> IELTS &amp; CEFR practice platform</div>
              <h1>Prepare smarter.<br />Perform with confidence.</h1>
              <p>ARK test, mock, natija va progressni bitta zamonaviy tizimga birlashtiradi. Real imtihonga yaqin practice qiling, natijani ko‘ring va keyingi qadamni aniq biling.</p>
              <div className="arkHeroActions">
                <Link className="arkPrimaryButton" href="/dashboard">Dashboardni ochish <span>→</span></Link>
                <Link className="arkSecondaryButton" href="/mock">Mock testlar <span>↗</span></Link>
              </div>
              <div className="arkHeroTrust">
                <div><strong>4 skills</strong><span>IELTS workflow</span></div>
                <div><strong>A2–C1</strong><span>CEFR practice</span></div>
                <div><strong>Cloud</strong><span>tests &amp; results</span></div>
              </div>
            </div>

            <div className="arkHeroVisual" data-reveal="up" data-tilt>
              <div className="heroBrowserBar"><span className="browserDots"><i /><i /><i /></span><span>arkexam.uz/dashboard</span><b>•••</b></div>
              <div className="heroDashboardMock">
                <aside className="mockSidebar">
                  <div className="mockLogo"><span>A</span><b>ARK</b></div>
                  <div className="mockNav active"><span>⌂</span><b>Dashboard</b></div>
                  <div className="mockNav"><span>▦</span><b>Practice</b></div>
                  <div className="mockNav"><span>◎</span><b>Mock tests</b></div>
                  <div className="mockNav"><span>✦</span><b>Results</b></div>
                </aside>
                <div className="mockContent">
                  <div className="mockTopbar"><strong>Dashboard</strong><div><span>★ 0</span><span>UZ</span><i>A</i></div></div>
                  <div className="mockWelcome">
                    <div><small>Good afternoon 👋</small><h3>Welcome back</h3></div>
                    <p>Consistency is the key to<br /><strong>mastering any skill.</strong></p>
                  </div>
                  <div className="mockMetrics">
                    <article className="highlight"><span>◎</span><strong>8.0</strong><small>Target Band</small></article>
                    <article><span>⌁</span><strong>—</strong><small>Avg Score</small></article>
                    <article><span>▦</span><strong>12</strong><small>Tests</small></article>
                    <article><span>◷</span><strong>51m</strong><small>Practice</small></article>
                  </div>
                  <div className="mockChartCard">
                    <div className="mockChartHead"><div><strong>Weekly Performance</strong><small>last 7 days</small></div><span>Listening</span></div>
                    <svg viewBox="0 0 520 140" aria-hidden="true"><g><line x1="0" y1="24" x2="520" y2="24"/><line x1="0" y1="68" x2="520" y2="68"/><line x1="0" y1="112" x2="520" y2="112"/></g><path d="M0 112 C82 110 120 112 180 108 S280 112 342 105 S432 76 520 30"/><circle cx="520" cy="30" r="5"/></svg>
                    <div className="mockDays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  </div>
                </div>
              </div>
              <div className="floatingChip chipOne">✓ Real exam flow</div>
              <div className="floatingChip chipTwo">↗ Progress tracking</div>
            </div>
          </div>
        </section>

        <section className="arkProofStrip" aria-label="Platform capabilities">
          <div className="landingShell arkProofGrid">
            <span>REAL EXAM UI</span><span>IELTS</span><span>CEFR</span><span>CLOUD TESTS</span><span>RESULT TRACKING</span>
          </div>
        </section>

        <section className="arkFeatureSection" id="features">
          <div className="landingShell">
            <div className="arkSectionIntro" data-reveal="up">
              <div><span className="arkEyebrow">BUILT FOR SERIOUS PRACTICE</span><h2>Everything you need to improve, without the clutter.</h2></div>
              <p>ARK o‘quvchini ortiqcha elementlar bilan chalg‘itmaydi. Har bir ekran practice, mock va natijani tezroq boshqarish uchun qurilgan.</p>
            </div>

            <div className="arkFeatureGrid">
              <article className="featureLarge" data-reveal="up">
                <span className="featureIcon mint">01</span>
                <div><h3>Exam-first interface</h3><p>Reading, Listening va boshqa testlar uchun toza, aniq va focusga mo‘ljallangan exam layout.</p></div>
                <div className="featureMiniUi">
                  <div className="miniUiTop"><span>READING PASSAGE</span><b>18:42</b></div>
                  <div className="miniUiBody"><p>Practice becomes more effective when every answer is followed by clear analysis and a focused next step.</p><div><span>A</span><b>Repeat the same task</b></div><div className="selected"><span>B</span><b>Review mistakes and improve</b><em>✓</em></div><div><span>C</span><b>Focus only on speed</b></div></div>
                </div>
              </article>

              <article data-reveal="up" className="featureSoft">
                <span className="featureIcon blue">02</span>
                <h3>Progress that makes sense</h3>
                <p>Skill bo‘yicha ko‘rsatkichlar, practice history va keyingi qadam bitta dashboardda.</p>
                <div className="featureBars"><span><i style={{width:'76%'}} /></span><span><i style={{width:'58%'}} /></span><span><i style={{width:'88%'}} /></span></div>
              </article>

              <article data-reveal="up" className="featureSoft">
                <span className="featureIcon violet">03</span>
                <h3>Cloud test library</h3>
                <p>Published testlar markaziy kutubxonadan keladi va o‘quvchi uchun bir xil professional formatda ochiladi.</p>
                <div className="featureFiles"><span>IELTS Reading <b>→</b></span><span>Listening Mock <b>→</b></span><span>CEFR Practice <b>→</b></span></div>
              </article>
            </div>
          </div>
        </section>

        <section className="arkTracks" id="tracks">
          <div className="landingShell">
            <div className="arkSectionIntro compact" data-reveal="up">
              <div><span className="arkEyebrow">TWO EXAM ROUTES</span><h2>One platform. Two clear paths.</h2></div>
              <p>IELTS va CEFR alohida workflow bilan ishlaydi, lekin progress va experience bitta ARK tizimida qoladi.</p>
            </div>
            <div className="arkTrackGrid">
              <article data-reveal="up">
                <div className="trackTop"><span>IELTS</span><b>01</b></div>
                <h3>IELTS Academic</h3>
                <p>Real examga yaqin Reading, Listening, Writing va Speaking workflow.</p>
                <div className="trackSkills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <Link href="/ielts">IELTS platformani ochish <span>→</span></Link>
              </article>
              <article data-reveal="up">
                <div className="trackTop"><span>CEFR</span><b>02</b></div>
                <h3>CEFR Practice</h3>
                <p>A2 dan C1 gacha bosqichma-bosqich practice, mock va natija nazorati.</p>
                <div className="trackSkills">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <Link href="/cefr">CEFR platformani ochish <span>→</span></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="arkHow" id="how">
          <div className="landingShell arkHowGrid">
            <div className="arkHowIntro" data-reveal="up">
              <span className="arkEyebrow light">HOW IT WORKS</span>
              <h2>From access to improvement in four simple steps.</h2>
              <p>Student testni qayerdan topish yoki keyin nima qilishni o‘ylab qolmaydi. Flow aniq va bir xil.</p>
              <Link className="arkSecondaryButton dark" href="/dashboard">Platformani ko‘rish <span>→</span></Link>
            </div>
            <div className="arkSteps">
              <article data-reveal="up"><span>01</span><div><h3>Access</h3><p>Account yoki Telegram orqali platformaga kiring.</p></div></article>
              <article data-reveal="up"><span>02</span><div><h3>Practice</h3><p>Real exam formatiga yaqin testni ishlang.</p></div></article>
              <article data-reveal="up"><span>03</span><div><h3>Review</h3><p>Natija va xatolarni bitta joyda ko‘ring.</p></div></article>
              <article data-reveal="up"><span>04</span><div><h3>Improve</h3><p>Keyingi practice’ni aynan kerakli skillga qarating.</p></div></article>
            </div>
          </div>
        </section>

        <section className="arkFinalCta">
          <div className="landingShell arkFinalCard" data-reveal="up">
            <div><span className="arkEyebrow">START WITH ARK</span><h2>Your next mock deserves a better system.</h2><p>Professional practice, clean dashboard and one clear path forward.</p></div>
            <div><Link className="arkPrimaryButton" href="/dashboard">Open dashboard <span>→</span></Link><a className="arkSecondaryButton" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Telegram <span>↗</span></a></div>
          </div>
        </section>
      </main>

      <footer className="arkFooter">
        <div className="landingShell"><div className="footerBrand"><span className="arkBrandMark"><span>A</span></span><div><strong>ARK</strong><small>IELTS • CEFR • MOCK</small></div></div><p>© 2026 ARK Exam Hub. Built for focused practice.</p></div>
      </footer>
    </div>
  );
}
