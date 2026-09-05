import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

function ArrowRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

function Check() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function BookOpen() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5h6a3 3 0 0 1 3 3V20a3.5 3.5 0 0 0-3.5-3.5H3Z" /><path d="M21 5.5h-6a3 3 0 0 0-3 3V20a3.5 3.5 0 0 1 3.5-3.5H21Z" /></svg>;
}

function Headphones() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0" /><path d="M6 19H5a1 1 0 0 1-1-1v-4h4v5H6ZM18 19h1a1 1 0 0 0 1-1v-4h-4v5h2Z" /></svg>;
}

function PenNib() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-9 9-7 1 1-7 9-9Z" /><path d="m12 6 6 6M4 20l6-6" /></svg>;
}

function Microphone() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>;
}

const faqItems = [
  ['Bu platformada qaysi IELTS skillarini ishlash mumkin?', 'Reading, Listening, Writing va Speaking — to‘rtta asosiy IELTS skillini alohida practice yoki full mock formatida ishlash mumkin.'],
  ['Mock testlar real IELTS formatiga yaqinmi?', 'Ha. Section navigation, savol oqimi, exam-style interfeys va test yakunidagi review real imtihon tajribasiga imkon qadar yaqinlashtirilgan.'],
  ['IELTS bilan birga CEFR ham bormi?', 'Ha. Platformada IELTS asosiy yo‘nalish sifatida ko‘rsatiladi, CEFR testlari esa alohida yo‘nalish sifatida mavjud.'],
  ['Natijalar va progress saqlanadimi?', 'Ha. Yakunlangan testlar natijalari profilingizda saqlanadi va skill bo‘yicha progressni kuzatishga yordam beradi.'],
  ['Full Mock qanday ishlaydi?', 'Full Mock bir nechta skillni ketma-ket exam flow ichida ishlash uchun mo‘ljallangan. Har bir section alohida boshqariladi va natijalar yakunda ko‘rinadi.'],
  ['Platformaga qanday kiraman?', 'Kirish tugmasini bosing, profilingizga kiring va kerakli IELTS, CEFR yoki Full Mock testini tanlang.'],
];

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

          <div className="arkIeltsLinks">
            <Link href="#skills">IELTS Skills</Link>
            <Link href="#full-mock">Full Mock</Link>
            <Link href="#experience">Exam Experience</Link>
            <Link href="#faq">FAQ</Link>
          </div>

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
              <Link href="#experience" className="arkIeltsSecondary">Exam interfeysini ko‘rish</Link>
            </div>

            <div className="arkIeltsHeroChecks">
              <span><Check /> 4 IELTS skills</span>
              <span><Check /> Exam-style interface</span>
              <span><Check /> Results &amp; review</span>
            </div>
          </div>

          <div className="arkExamPreview" aria-label="IELTS exam interface preview">
            <span className="arkExamFloat">40 Questions • Autosave • Review</span>
            <div className="arkExamTopbar">
              <div className="arkExamBrand">
                <span className="arkExamBrandLogo"><ArkLogoIcon /></span>
                <p><strong>IELTS Listening</strong><small>ARK EDUCATION MOCK</small></p>
              </div>
              <span className="arkExamTimer">Time left <b>29:42</b></span>
            </div>

            <div className="arkExamBody">
              <aside className="arkExamSidebar">
                <span className="arkExamSidebarTitle">TEST SECTIONS</span>
                <div className="arkExamPart active"><b>1</b> Part 1</div>
                <div className="arkExamPart"><b>2</b> Part 2</div>
                <div className="arkExamPart"><b>3</b> Part 3</div>
                <div className="arkExamPart"><b>4</b> Part 4</div>
              </aside>

              <div className="arkExamContent">
                <div className="arkExamQuestionMeta"><span>SECTION 1 • QUESTIONS 1–10</span><b>Question 6 of 40</b></div>
                <div className="arkExamQuestion">
                  <small>CHOOSE THE CORRECT LETTER, A, B OR C</small>
                  <h3>What does the speaker say is the main advantage of the programme?</h3>
                  <div className="arkExamOptions">
                    <div className="arkExamOption"><i /><strong>A</strong><span>It is available throughout the year.</span></div>
                    <div className="arkExamOption selected"><i /><strong>B</strong><span>It gives students practical experience.</span></div>
                    <div className="arkExamOption"><i /><strong>C</strong><span>It is taught by university lecturers.</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="arkExamNavigator">
              <div className="arkExamNumbers"><span className="done">1</span><span className="done">2</span><span className="done">3</span><span className="done">4</span><span className="done">5</span><span className="current">6</span><span>7</span><span>8</span></div>
              <span className="arkExamNext">Next <ArrowRight /></span>
            </div>
          </div>
        </section>

        <section className="arkIeltsProof" aria-label="Platforma imkoniyatlari">
          <div><strong>4 IELTS Skills</strong><span>Reading, Listening, Writing, Speaking</span></div>
          <div><strong>40-question flow</strong><span>Real test tartibiga yaqin navigatsiya</span></div>
          <div><strong>Full Mock</strong><span>Bir nechta skill bitta exam flow ichida</span></div>
          <div><strong>Detailed Review</strong><span>Natija, xatolar va keyingi focus</span></div>
        </section>

        <section className="arkIeltsSection" id="skills">
          <div className="arkIeltsSectionHead">
            <span>IELTS SKILLS</span>
            <h2>Har bir skill — o‘zining exam muhitida.</h2>
            <p>Landingning asosiy vazifasi platformaning nima ekanini bir qarashda tushuntirish. Shu sabab har bir skill real test jarayoniga bog‘langan.</p>
          </div>

          <div className="arkSkillGrid">
            <article className="arkSkillCard">
              <div className="arkSkillTop"><span className="arkSkillIcon"><BookOpen /></span><span className="arkSkillIndex">01</span></div>
              <h3>Reading</h3>
              <p>Passage, question panel, highlight va review — bir xil fokuslangan test oqimida.</p>
              <div className="arkSkillTags"><span>3 Passages</span><span>40 Questions</span><span>Highlight</span></div>
            </article>
            <article className="arkSkillCard">
              <div className="arkSkillTop"><span className="arkSkillIcon"><Headphones /></span><span className="arkSkillIndex">02</span></div>
              <h3>Listening</h3>
              <p>4 part audio test, section navigation va real-time answer flow bilan practice.</p>
              <div className="arkSkillTags"><span>4 Parts</span><span>40 Questions</span><span>Audio Flow</span></div>
            </article>
            <article className="arkSkillCard">
              <div className="arkSkillTop"><span className="arkSkillIcon"><PenNib /></span><span className="arkSkillIndex">03</span></div>
              <h3>Writing</h3>
              <p>Task 1 va Task 2 uchun ortiqcha elementlarsiz, imtihonga mos yozish maydoni.</p>
              <div className="arkSkillTags"><span>Task 1</span><span>Task 2</span><span>Submission</span></div>
            </article>
            <article className="arkSkillCard">
              <div className="arkSkillTop"><span className="arkSkillIcon"><Microphone /></span><span className="arkSkillIndex">04</span></div>
              <h3>Speaking</h3>
              <p>Part 1–3 practice, savollar ketma-ketligi va speaking history bilan muntazam mashq.</p>
              <div className="arkSkillTags"><span>Part 1</span><span>Part 2</span><span>Part 3</span></div>
            </article>
          </div>
        </section>

        <section className="arkFullMock" id="full-mock">
          <div className="arkFullMockCopy">
            <span>FULL MOCK EXPERIENCE</span>
            <h2>Bitta test emas.<br /><em>To‘liq imtihon oqimi.</em></h2>
            <p>Full Mock’da skillar alohida kartochka sifatida emas, bir-biriga ulanadigan imtihon bosqichlari sifatida ko‘rinadi.</p>
            <ul className="arkFullMockList">
              <li><Check /> Section bo‘yicha aniq navigation</li>
              <li><Check /> Javoblar va progress saqlanadi</li>
              <li><Check /> Yakunda natija va review</li>
            </ul>
          </div>

          <div className="arkMockFlow" aria-label="Full mock skill flow">
            <article className="arkMockStage"><b>01</b><h3>Listening</h3><p>Audio + 4 parts + 40 questions</p><span>START</span></article>
            <article className="arkMockStage"><b>02</b><h3>Reading</h3><p>3 passages + exam navigation</p><span>CONTINUE</span></article>
            <article className="arkMockStage"><b>03</b><h3>Writing</h3><p>Task 1 + Task 2 submission</p><span>WRITE</span></article>
            <article className="arkMockStage"><b>04</b><h3>Speaking</h3><p>Part 1–3 structured practice</p><span>FINISH</span></article>
          </div>
        </section>

        <section className="arkIeltsExperience" id="experience">
          <div className="arkReadingPreview" aria-label="Reading interface preview">
            <div className="arkReadingTop"><strong>IELTS Reading • Passage 2</strong><span>Questions 14–26</span></div>
            <div className="arkReadingBody">
              <div className="arkPassagePane">
                <small>READING PASSAGE 2</small>
                <h4>The future of urban farming</h4>
                <div className="arkTextLines"><i /><i /><i className="marked" /><i /><i /><i /></div>
              </div>
              <div className="arkQuestionPane">
                <small>QUESTIONS 14–18</small>
                <h4>Choose the correct heading.</h4>
                <div className="arkMiniQuestion">14. Paragraph A discusses the main reason for...</div>
                <div className="arkMiniSelect"><span>Select answer</span><b>⌄</b></div>
                <div className="arkMiniQuestion">15. Paragraph B gives an example of...</div>
                <div className="arkMiniSelect"><span>Select answer</span><b>⌄</b></div>
              </div>
            </div>
          </div>

          <div className="arkIeltsExperienceCopy">
            <span>EXAM EXPERIENCE</span>
            <h2>Practice qilayotganda sayt emas, imtihon esga tushsin.</h2>
            <p>Interfeysdagi har bir element — passage, timer, part navigation, answer field va review — foydalanuvchini testning o‘ziga fokuslash uchun ishlaydi.</p>
            <ul>
              <li><Check /> Reading’da passage va questions yonma-yon</li>
              <li><Check /> Listening’da part va savol navigatsiyasi</li>
              <li><Check /> Review’da to‘g‘ri va xato javoblar aniq ko‘rinadi</li>
              <li><Check /> Desktop va mobile uchun moslashtirilgan</li>
            </ul>
          </div>
        </section>

        <section className="arkProgressStrip" aria-label="Progress overview">
          <div className="arkProgressLead"><span>NATIJALAR</span><strong>Progress — testdan keyin.</strong></div>
          <div className="arkProgressMetric"><span>Reading</span><strong>7.0</strong></div>
          <div className="arkProgressMetric"><span>Listening</span><strong>6.5</strong></div>
          <div className="arkProgressMetric"><span>Writing</span><strong>6.0</strong></div>
          <div className="arkProgressMetric"><span>Speaking</span><strong>6.0</strong></div>
        </section>

        <section className="arkIeltsFaq" id="faq">
          <div className="arkIeltsFaqIntro">
            <span>FAQ</span>
            <h2>Platforma haqida asosiy savollar.</h2>
            <p>IELTS practice va Full Mock’dan foydalanishdan oldin kerak bo‘ladigan qisqa ma’lumotlar.</p>
          </div>
          <div className="arkIeltsFaqList">
            {faqItems.map(([question, answer], index) => (
              <details key={question} className="arkIeltsFaqItem">
                <summary><span><b>{String(index + 1).padStart(2, '0')}</b>{question}</span><i className="arkIeltsFaqPlus" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="arkIeltsFinal">
          <div className="arkIeltsFinalCopy"><span>ARK EDUCATION • IELTS PLATFORM</span><h2>Keyingi mock testingizni real exam muhitida boshlang.</h2><p>IELTS • CEFR • FULL MOCK • RESULTS • REVIEW</p></div>
          <Link href="/login?next=/mock" className="arkIeltsFinalButton">Platformaga kirish <ArrowRight /></Link>
        </section>
      </main>

      <footer className="arkIeltsFooter">
        <div className="arkIeltsFooterTop">
          <Link href="/" className="arkIeltsBrand" aria-label="ARK Education">
            <span className="arkIeltsBrandMark"><ArkLogoIcon /></span>
            <span className="arkIeltsBrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
          </Link>
          <nav><Link href="#skills">IELTS Skills</Link><Link href="#full-mock">Full Mock</Link><Link href="#experience">Exam Experience</Link><Link href="/login">Kirish</Link></nav>
        </div>
        <div className="arkIeltsFooterBottom"><p>© 2026 ARK Education Platform. All information reserved.</p><span>IELTS • CEFR • FULL MOCK</span></div>
      </footer>
    </div>
  );
}
