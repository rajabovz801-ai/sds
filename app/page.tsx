import Link from 'next/link';
import { Header } from '@/components/Header';
import { LandingMotion } from '@/components/LandingMotion';

const skills = ['Reading', 'Listening', 'Writing', 'Speaking'];

export default function HomePage() {
  return (
    <div className="landingRoot">
      <LandingMotion />
      <Header />

      <main>
        <section className="heroEditorial" id="platform">
          <div className="shell heroEditorialGrid">
            <div className="heroEditorialCopy" data-reveal="up">
              <div className="heroKicker"><span className="liveDot" /> IELTS &amp; CEFR exam platform</div>
              <h1>Practice that feels like the real exam.</h1>
              <p className="heroLead">Mock test, tahlil va progressni bitta aniq tizimga yig‘dik. Testni ishlang, natijani ko‘ring va keyingi practice’ni nimaga qaratish kerakligini biling.</p>

              <div className="heroActions">
                <Link className="primaryCta" href="/dashboard">Dashboardni ochish <span>→</span></Link>
                <Link className="secondaryCta" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Telegram orqali kirish <span>↗</span></Link>
              </div>

              <div className="heroMetaBar">
                <div><strong>IELTS</strong><span>Full mock workflow</span></div>
                <div><strong>CEFR</strong><span>A2 dan C1 gacha</span></div>
                <div><strong>Cloud</strong><span>Tests &amp; results</span></div>
              </div>
            </div>

            <div className="examPreviewShell revealDelay1" data-reveal="up">
              <div className="examPreview" id="mock" data-tilt aria-label="ARK mock exam preview">
                <div className="previewTopbar">
                  <div className="previewBrandLine"><span className="previewLogo">A</span><b>ARK MOCK</b></div>
                  <div className="previewContext">IELTS Academic · Reading</div>
                  <div className="previewTimer"><span>Time left</span><b>18:42</b></div>
                </div>

                <div className="previewSubbar">
                  <span className="previewSectionActive">Passage 2</span>
                  <span>Questions 14–26</span>
                  <span className="previewSecure">Secure mode</span>
                </div>

                <div className="previewBody">
                  <div className="previewPassage">
                    <span className="previewLabel">READING PASSAGE</span>
                    <h3>Why practice systems matter</h3>
                    <p>Students improve faster when practice is followed by clear analysis. A strong system identifies recurring mistakes and turns each result into a focused next step.</p>
                    <p>The aim is not simply to complete more tests, but to understand <mark>why an answer was right or wrong</mark> and what should be trained next.</p>
                  </div>

                  <div className="previewQuestion">
                    <div className="questionHeader"><span>QUESTION 14</span><b>Choose one answer</b></div>
                    <h3>According to the passage, effective practice should:</h3>
                    <div className="previewOptions">
                      <div className="previewOption"><span>A</span><p>focus only on speed</p></div>
                      <div className="previewOption selected"><span>B</span><p>identify mistakes and guide the next step</p><i>✓</i></div>
                      <div className="previewOption"><span>C</span><p>avoid reviewing previous answers</p></div>
                      <div className="previewOption"><span>D</span><p>repeat the same task continuously</p></div>
                    </div>
                  </div>
                </div>

                <div className="previewFooter">
                  <div className="previewProgressText"><b>14</b><span>/ 40 answered</span></div>
                  <div className="previewProgress"><span /></div>
                  <button type="button" tabIndex={-1}>Review later</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="proofStrip" aria-label="Platform capabilities">
          <div className="shell proofStripGrid">
            <div data-reveal="up"><strong>01</strong><span>Real exam interface</span></div>
            <div className="revealDelay1" data-reveal="up"><strong>02</strong><span>Cloud test library</span></div>
            <div className="revealDelay2" data-reveal="up"><strong>03</strong><span>Result tracking</span></div>
            <div className="revealDelay3" data-reveal="up"><strong>04</strong><span>Admin control</span></div>
          </div>
        </section>

        <section className="trackChoice" id="tracks">
          <div className="shell">
            <div className="sectionHeader" data-reveal="up">
              <div>
                <span className="sectionEyebrow">EXAM ROUTES</span>
                <h2>Bitta platforma. Ikki yo‘nalish.</h2>
              </div>
              <p>Qaysi imtihonga tayyorlanayotgan bo‘lsangiz, shu yo‘nalish ichida practice, mock va natijalarni boshqaring.</p>
            </div>

            <div className="trackCards">
              <article className="trackCard" data-reveal="up">
                <div className="trackCardTop">
                  <div><span className="trackIndex">01</span><span className="trackTag">IELTS</span></div>
                  <span className="trackArrow">↗</span>
                </div>
                <h3>IELTS Mock Platform</h3>
                <p>Academic exam flow uchun Reading, Listening, Writing va Speaking practice’lari.</p>
                <div className="skillGrid">{skills.map(skill => <span key={skill}>{skill}</span>)}</div>
                <div className="trackCardFooter">
                  <Link className="cardPrimary" href="/ielts">Platformani ko‘rish <span>→</span></Link>
                  <Link className="cardSecondary" href="https://t.me/arkedu_bot?start=ielts" target="_blank" rel="noopener noreferrer">Access olish</Link>
                </div>
              </article>

              <article className="trackCard revealDelay1" data-reveal="up">
                <div className="trackCardTop">
                  <div><span className="trackIndex">02</span><span className="trackTag">CEFR</span></div>
                  <span className="trackArrow">↗</span>
                </div>
                <h3>CEFR Mock Platform</h3>
                <p>A2 dan C1 gacha skill-based practice va bosqichma-bosqich natija nazorati.</p>
                <div className="skillGrid">{skills.map(skill => <span key={skill}>{skill}</span>)}</div>
                <div className="trackCardFooter">
                  <Link className="cardPrimary" href="/cefr">Platformani ko‘rish <span>→</span></Link>
                  <Link className="cardSecondary" href="https://t.me/arkedu_bot?start=cefr" target="_blank" rel="noopener noreferrer">Access olish</Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="platformSection" id="features">
          <div className="shell">
            <div className="sectionHeader compact" data-reveal="up">
              <div><span className="sectionEyebrow">BUILT FOR PRACTICE</span><h2>Exam day’ga yaqinroq tajriba.</h2></div>
              <p>Interface bezak uchun emas. Har bir element test ishlash, tahlil qilish va boshqarishni tezlashtirish uchun qurilgan.</p>
            </div>

            <div className="featureGrid">
              <article data-reveal="up"><span className="featureNo">01</span><h3>Exam-first interface</h3><p>Toza savol layouti, test viewer, navigation va focus holatlari o‘quvchini testning o‘zida ushlab turadi.</p></article>
              <article className="revealDelay1" data-reveal="up"><span className="featureNo">02</span><h3>Cloud content system</h3><p>HTML testlar admin paneldan yuklanadi, Supabase’da saqlanadi va saytning o‘zida ochiladi.</p></article>
              <article className="revealDelay2" data-reveal="up"><span className="featureNo">03</span><h3>One control surface</h3><p>Admin panel testlar, statuslar va keyingi mock workflow’larini bitta joydan boshqarishga tayyor.</p></article>
            </div>
          </div>
        </section>

        <section className="processSection" id="how">
          <div className="shell processGrid">
            <div className="processIntro" data-reveal="up">
              <span className="sectionEyebrow light">HOW IT WORKS</span>
              <h2>Oddiy oqim. Kam chalg‘ituvchi element.</h2>
              <p>Student nima qilishini izlamaydi — tizim uni keyingi qadamga olib boradi.</p>
            </div>

            <div className="processList">
              <article data-reveal="up"><span>01</span><div><h3>Access</h3><p>Telegram orqali platformaga kirish yoki mock access olish.</p></div></article>
              <article className="revealDelay1" data-reveal="up"><span>02</span><div><h3>Practice</h3><p>Real exam formatiga yaqin testni sayt ichida ishlash.</p></div></article>
              <article className="revealDelay2" data-reveal="up"><span>03</span><div><h3>Result</h3><p>Natija, skill bo‘yicha ko‘rsatkich va keyingi qadamni ko‘rish.</p></div></article>
              <article className="revealDelay3" data-reveal="up"><span>04</span><div><h3>Improve</h3><p>Keyingi practice’ni aynan kerakli skill va xato turiga qaratish.</p></div></article>
            </div>
          </div>
        </section>

        <section className="finalCta">
          <div className="shell finalCtaCard" data-reveal="up">
            <div><span className="sectionEyebrow">START PRACTICING</span><h2>Keyingi mock’ni tartibli tizimda ishlang.</h2></div>
            <div className="finalCtaActions">
              <Link className="primaryCta" href="/dashboard">Dashboard <span>→</span></Link>
              <Link className="secondaryCta" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Telegram bot <span>↗</span></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="siteFooter">
        <div className="shell footerInner"><span>© 2026 ARK MOCK</span><span>IELTS · CEFR · Practice · Mock</span></div>
      </footer>
    </div>
  );
}
