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

function Play() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z" /></svg>;
}

export default async function HomePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/mock');

  return (
    <div className="arkRefLanding">
      <div className="arkRefShell">
        <header className="arkRefHeader">
          <nav className="arkRefNav" aria-label="Asosiy navigatsiya">
            <Link href="/" className="arkRefBrand" aria-label="ARK Education bosh sahifa">
              <span className="arkRefBrandMark"><ArkLogoIcon /></span>
              <span className="arkRefBrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
            </Link>

            <div className="arkRefLinks">
              <Link href="#skills">IELTS Skills</Link>
              <Link href="#full-mock">Full Mock</Link>
              <Link href="#experience">Exam Experience</Link>
              <Link href="#results">Results</Link>
            </div>

            <div className="arkRefActions">
              <Link href="/login" className="arkRefLogin">Kirish</Link>
              <Link href="/login?next=/mock" className="arkRefNavButton">Mock boshlash <ArrowRight /></Link>
            </div>
          </nav>
        </header>

        <main>
          <section className="arkRefHero">
            <div className="arkRefHeroCopy">
              <span className="arkRefKicker"><i /> IELTS • CEFR • FULL MOCK</span>
              <h1>Real IELTS practice.<em>Real exam experience.</em></h1>
              <p>Reading, Listening, Writing va Speaking’ni haqiqiy imtihonga yaqin muhitda mashq qiling. Testni bajaring, natijani ko‘ring va keyingi urinishda aniqroq ishlang.</p>

              <div className="arkRefHeroActions">
                <Link href="/login?next=/mock" className="arkRefPrimary">IELTS Mock boshlash <ArrowRight /></Link>
                <Link href="#experience" className="arkRefGhost"><span><Play /></span> Exam interfeysini ko‘rish</Link>
              </div>

              <div className="arkRefMiniTrust">
                <span><Check /> 4 IELTS skills</span>
                <span><Check /> Exam-style interface</span>
                <span><Check /> Results &amp; review</span>
              </div>
            </div>

            <div className="arkRefHeroArt" aria-label="IELTS test interfeysi preview">
              <span className="arkRefBlob one" />
              <span className="arkRefBlob two" />
              <span className="arkRefFloatingBadge one"><b>40</b> questions</span>
              <span className="arkRefFloatingBadge two"><b>29:42</b> time left</span>

              <div className="arkRefDevice">
                <div className="arkRefDeviceTop">
                  <strong>IELTS Listening • Mock Test</strong>
                  <span>Time left <b>29:42</b></span>
                </div>
                <div className="arkRefDeviceBody">
                  <aside className="arkRefDeviceSide">
                    <small>TEST SECTIONS</small>
                    <div className="arkRefPart active"><b>1</b> Part 1</div>
                    <div className="arkRefPart"><b>2</b> Part 2</div>
                    <div className="arkRefPart"><b>3</b> Part 3</div>
                    <div className="arkRefPart"><b>4</b> Part 4</div>
                  </aside>
                  <div className="arkRefDeviceContent">
                    <small>QUESTION 6 OF 40</small>
                    <h3>What does the speaker say is the main advantage of the programme?</h3>
                    <div className="arkRefChoice">
                      <div><i /><b>A</b><span>It is available throughout the year.</span></div>
                      <div className="selected"><i /><b>B</b><span>It gives students practical experience.</span></div>
                      <div><i /><b>C</b><span>It is taught by university lecturers.</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="arkRefServices" id="skills">
            <div className="arkRefSectionHead">
              <span>IELTS SKILLS</span>
              <h2>Har bir skill uchun alohida, fokuslangan muhit.</h2>
              <p>Reading, Listening, Writing va Speaking bir xil platformada, lekin har biri o‘z vazifasiga mos test interfeysida ishlaydi.</p>
            </div>

            <div className="arkRefServiceGrid">
              <article className="arkRefServiceCard">
                <span className="arkRefServiceIcon"><BookOpen /></span>
                <h3>Reading</h3>
                <p>3 passage, 40 savol, highlight, answer navigation va review.</p>
                <small>PASSAGES • QUESTIONS • REVIEW</small>
              </article>
              <article className="arkRefServiceCard">
                <span className="arkRefServiceIcon"><Headphones /></span>
                <h3>Listening</h3>
                <p>4 part audio test, section navigation va real-time answer flow.</p>
                <small>4 PARTS • AUDIO • 40 QUESTIONS</small>
              </article>
              <article className="arkRefServiceCard">
                <span className="arkRefServiceIcon"><PenNib /></span>
                <h3>Writing</h3>
                <p>Task 1 va Task 2 uchun toza, distraction-free yozish muhiti.</p>
                <small>TASK 1 • TASK 2 • SUBMISSION</small>
              </article>
              <article className="arkRefServiceCard">
                <span className="arkRefServiceIcon"><Microphone /></span>
                <h3>Speaking</h3>
                <p>Part 1–3 practice, savollar ketma-ketligi va speaking history.</p>
                <small>PART 1 • PART 2 • PART 3</small>
              </article>
            </div>
          </section>

          <section className="arkRefPeach" id="full-mock">
            <div className="arkRefMockArt" aria-hidden="true">
              <span className="arkRefChair" />
              <div className="arkRefLaptopPerson">
                <span className="arkRefHead" />
                <span className="arkRefBody" />
                <span className="arkRefLaptop" />
                <span className="arkRefLeg" />
              </div>
              <span className="arkRefChat">•••</span>
            </div>

            <div className="arkRefPeachCopy">
              <span>FULL MOCK EXPERIENCE</span>
              <h2>Simple flow.<br /><em>Serious exam practice.</em></h2>
              <p>Full Mock’da skillar alohida sahifalar emas, bir-biriga ulanadigan imtihon bosqichlari sifatida ishlaydi.</p>

              <div className="arkRefSteps">
                <div className="arkRefStep"><b>1</b><div><h4>Yo‘nalishni tanlang</h4><p>IELTS, CEFR yoki Full Mock ichidan keraklisini oching.</p></div></div>
                <div className="arkRefStep"><b>2</b><div><h4>Testni boshlang</h4><p>Section navigation va exam-style interface orqali ishlang.</p></div></div>
                <div className="arkRefStep"><b>3</b><div><h4>Javoblarni yakunlang</h4><p>Javoblar test davomida saqlanadi va yakunda topshiriladi.</p></div></div>
                <div className="arkRefStep"><b>4</b><div><h4>Natija va review</h4><p>Natijani ko‘ring va keyingi practice uchun fokusni aniqlang.</p></div></div>
              </div>

              <div className="arkRefPeachActions">
                <Link href="/login?next=/mock">Mock boshlash</Link>
                <Link href="#experience">Batafsil ko‘rish</Link>
              </div>
            </div>
          </section>

          <section className="arkRefExperience" id="experience">
            <div className="arkRefExperienceCopy">
              <span>EXAM EXPERIENCE</span>
              <h2>Practice qilayotganda sayt emas, imtihon esga tushsin.</h2>
              <p>Interfeysdagi har bir element foydalanuvchini testning o‘ziga fokuslash uchun ishlaydi.</p>
              <ul>
                <li><Check /> Reading’da passage va questions yonma-yon</li>
                <li><Check /> Listening’da part va savol navigatsiyasi</li>
                <li><Check /> Review’da to‘g‘ri va xato javoblar aniq ko‘rinadi</li>
                <li><Check /> Desktop va mobile uchun moslashtirilgan</li>
              </ul>
              <Link href="/login?next=/mock">Platformaga kirish <ArrowRight /></Link>
            </div>

            <div className="arkRefReadingArt" aria-label="IELTS Reading interfeysi preview">
              <span className="arkRefReadingBlob" />
              <div className="arkRefReadingCard">
                <div className="arkRefReadingTop"><strong>IELTS Reading • Passage 2</strong><span>Questions 14–26</span></div>
                <div className="arkRefReadingBody">
                  <div className="arkRefPassage">
                    <small>READING PASSAGE 2</small>
                    <h4>The future of urban farming</h4>
                    <div className="arkRefLines"><i /><i /><i /><i /><i /><i /></div>
                  </div>
                  <div className="arkRefQuestions">
                    <small>QUESTIONS 14–18</small>
                    <h4>Choose the correct heading.</h4>
                    <div className="arkRefQuestionMini">14. Paragraph A discusses the main reason for...</div>
                    <div className="arkRefSelectMini"><span>Select answer</span><b>⌄</b></div>
                    <div className="arkRefQuestionMini">15. Paragraph B gives an example of...</div>
                    <div className="arkRefSelectMini"><span>Select answer</span><b>⌄</b></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="arkRefResults" id="results">
            <div className="arkRefSectionHead">
              <span>RESULTS &amp; REVIEW</span>
              <h2>Testdan keyin nima bo‘lganini aniq ko‘ring.</h2>
              <p>Natijalar skill bo‘yicha tartibli ko‘rinadi va keyingi practice uchun qayerga ko‘proq e’tibor berish kerakligini tushunishga yordam beradi.</p>
            </div>

            <div className="arkRefResultGrid">
              <article className="arkRefResultCard"><span>Reading</span><strong>7.0</strong><small>Strongest skill</small></article>
              <article className="arkRefResultCard"><span>Listening</span><strong>6.5</strong><small>Keep practising</small></article>
              <article className="arkRefResultCard"><span>Writing</span><strong>6.0</strong><small>Next focus</small></article>
              <article className="arkRefResultCard"><span>Speaking</span><strong>6.0</strong><small>Build consistency</small></article>
            </div>
            <p className="arkRefResultsNote">Ko‘rsatilgan bandlar landing preview uchun namunaviy qiymatlar.</p>
          </section>

          <section className="arkRefCta">
            <div><h3>Real exam formatida practice qilishga tayyormisiz?</h3><p>IELTS • CEFR • FULL MOCK • RESULTS • REVIEW</p></div>
            <Link href="/login?next=/mock" className="arkRefCtaButton">Mock boshlash <ArrowRight /></Link>
          </section>
        </main>

        <footer className="arkRefFooter">
          <div className="arkRefFooterTop">
            <div className="arkRefFooterBrand">
              <Link href="/" className="arkRefBrand" aria-label="ARK Education">
                <span className="arkRefBrandMark"><ArkLogoIcon /></span>
                <span className="arkRefBrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
              </Link>
              <p>Professional IELTS va CEFR practice, mock, natija va review platformasi.</p>
            </div>
            <div className="arkRefFooterCol"><h4>Platform</h4><Link href="#skills">IELTS Skills</Link><Link href="#full-mock">Full Mock</Link><Link href="#experience">Exam Experience</Link></div>
            <div className="arkRefFooterCol"><h4>Skills</h4><span>Reading</span><span>Listening</span><span>Writing</span><span>Speaking</span></div>
            <div className="arkRefFooterCol"><h4>Access</h4><Link href="/login">Kirish</Link><Link href="/login?next=/mock">Mock boshlash</Link></div>
          </div>
          <div className="arkRefFooterBottom"><p>© 2026 ARK Education Platform. All information reserved.</p><span>IELTS • CEFR • FULL MOCK</span></div>
        </footer>
      </div>
    </div>
  );
}
