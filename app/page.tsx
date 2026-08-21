import { Header } from '@/components/Header';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="heroEditorial" id="platform">
          <div className="shell heroEditorialGrid">
            <div className="heroEditorialCopy">
              <span className="redEyebrow">ARK PRACTICE ENGINE</span>
              <h1>Mock qiling. <br />Tahlil qiling. <br />O‘sing.</h1>
              <p>IELTS va CEFR uchun zamonaviy mock platforma. Real exam uslubida practice qiling, natijangizni ko‘ring va keyingi qadamni aniq biling.</p>
              <div className="heroActions">
                <Link className="redButton" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Sign up <span>↗</span></Link>
                <a className="textButton" href="#tracks">Yo‘nalishni tanlash <span>↓</span></a>
              </div>
              <div className="heroFacts">
                <span><b>IELTS</b> full mock</span>
                <span><b>CEFR</b> A2 → C1</span>
                <span><b>Instant</b> result</span>
              </div>
            </div>

            <div className="examPreview" id="mock" aria-label="Mock exam preview">
              <div className="previewTopbar">
                <div className="windowDots"><i></i><i></i><i></i></div>
                <span>IELTS ACADEMIC · READING · PASSAGE 2</span>
                <b>18:42</b>
              </div>
              <div className="previewBody">
                <div className="previewPassage">
                  <span className="redEyebrow mini">PASSAGE</span>
                  <h3>Why practice systems matter</h3>
                  <p>Students improve faster when practice is followed by clear analysis. Instead of simply repeating tests, a strong system identifies recurring mistakes, compares performance, and turns each result into a focused next step.</p>
                  <p>The aim is not to complete more tests, but to understand <mark>why an answer was right or wrong</mark> and what should be trained next.</p>
                </div>
                <div className="previewQuestion">
                  <span className="redEyebrow mini">QUESTION 14</span>
                  <h3>According to the passage, effective practice should:</h3>
                  <label><span></span>A. focus only on speed</label>
                  <label className="selected"><span></span>B. identify mistakes and guide the next step</label>
                  <label><span></span>C. avoid reviewing previous answers</label>
                  <label><span></span>D. use the same task repeatedly</label>
                </div>
              </div>
              <div className="previewFooter">
                <span>14 / 40</span>
                <div className="questionDots">{Array.from({ length: 8 }).map((_, i) => <i key={i} className={i === 3 ? 'active' : ''}></i>)}</div>
                <span>Review later</span>
              </div>
            </div>
          </div>
        </section>

        <section className="trackChoice" id="tracks">
          <div className="shell">
            <div className="sectionIntro">
              <span className="redEyebrow">CHOOSE YOUR ROUTE</span>
              <h2>Yo‘nalishni tanlang.</h2>
              <p>Hozir qaysi imtihonga tayyorlanayotgan bo‘lsangiz, shu bo‘limdan boshlang.</p>
            </div>
            <div className="trackCards">
              <article className="trackCard">
                <div className="trackIndex">01</div>
                <div>
                  <span className="trackTag">IELTS</span>
                  <h3>IELTS Mock Platform</h3>
                  <p>Reading, Listening, Writing va Speaking bo‘yicha exam-style practice, natija va tahlil.</p>
                  <div className="cardActions">
                    <Link href="/ielts">Platformani ko‘rish <span>→</span></Link>
                    <Link className="cardSignup" href="https://t.me/arkedu_bot?start=ielts" target="_blank" rel="noopener noreferrer">Sign up</Link>
                  </div>
                </div>
              </article>
              <article className="trackCard">
                <div className="trackIndex">02</div>
                <div>
                  <span className="trackTag">CEFR</span>
                  <h3>CEFR Mock Platform</h3>
                  <p>A2 dan C1 gacha reading, listening, writing va speaking practice’larini bitta tizimda ishlang.</p>
                  <div className="cardActions">
                    <Link href="/cefr">Platformani ko‘rish <span>→</span></Link>
                    <Link className="cardSignup" href="https://t.me/arkedu_bot?start=cefr" target="_blank" rel="noopener noreferrer">Sign up</Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="processSection" id="how">
          <div className="shell processGrid">
            <div className="processIntro">
              <span className="redEyebrow">HOW IT WORKS</span>
              <h2>Oddiy. Tez. Tizimli.</h2>
            </div>
            <div className="processList">
              <article><span>01</span><div><h3>Sign up</h3><p>Telegram bot orqali ro‘yxatdan o‘ting.</p></div></article>
              <article><span>02</span><div><h3>Mock test</h3><p>Real imtihon ko‘rinishidagi testni boshlang.</p></div></article>
              <article><span>03</span><div><h3>Result & analysis</h3><p>Natijangizni ko‘ring va zaif joylarni aniqlang.</p></div></article>
              <article><span>04</span><div><h3>Train smarter</h3><p>Keyingi practice’ni aynan kerakli skillga qarating.</p></div></article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
