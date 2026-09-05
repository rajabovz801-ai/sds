import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

function ArrowRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
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

function Check() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>;
}

function Trend() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 10 11l4 4 6-8" /><path d="M15 7h5v5" /></svg>;
}

const faqItems = [
  ['Platformada qaysi imtihonlar mavjud?', 'ARK Education Platform’da IELTS va CEFR yo‘nalishlari bo‘yicha practice hamda mock testlar mavjud.'],
  ['Mock testlar real imtihon formatiga yaqinmi?', 'Ha. Test oqimi, section navigation va vaqt nazorati real imtihon tajribasiga imkon qadar yaqinlashtirilgan.'],
  ['Qaysi IELTS skillarini practice qilish mumkin?', 'Reading, Listening, Writing va Speaking — to‘rtta asosiy skill bitta profil va bitta platformada ishlaydi.'],
  ['Natijalar va progress saqlanadimi?', 'Ha. Yakunlangan testlar natijalari profilingizda saqlanadi va progressni kuzatishga yordam beradi.'],
  ['Telefonda foydalanish mumkinmi?', 'Asosiy platforma mobil qurilmalarga mos. Full mock uchun esa planshet yoki kompyuter qulayroq tajriba beradi.'],
  ['Platformaga qanday kiriladi?', 'Kirish tugmasi orqali profilingizga kirasiz va IELTS, CEFR yoki kerakli mock testni tanlaysiz.'],
];

export default async function HomePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/mock');

  return (
    <div className="arkLandingV2">
      <header className="arkV2Header">
        <nav className="arkV2Nav" aria-label="Asosiy navigatsiya">
          <Link href="/" className="arkV2Brand" aria-label="ARK Education bosh sahifa">
            <span className="arkV2BrandMark"><ArkLogoIcon /></span>
            <span className="arkV2BrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR PLATFORM</small></span>
          </Link>

          <div className="arkV2Links">
            <Link href="#skills">Ko‘nikmalar</Link>
            <Link href="#platform">Platforma</Link>
            <Link href="#faq">FAQ</Link>
          </div>

          <div className="arkV2NavActions">
            <Link href="/login" className="arkV2TextButton">Kirish</Link>
            <Link href="/login?next=/mock" className="arkV2DarkButton">Mock boshlash <ArrowRight /></Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="arkV2Hero">
          <div className="arkV2HeroCopy">
            <span className="arkV2Eyebrow"><i /> IELTS • CEFR • FULL MOCK</span>
            <h1>Imtihonga tayyorlaning.<br /><em>Progressni ko‘ring.</em></h1>
            <p>ARK Education — IELTS va CEFR uchun practice, full mock, natijalar va progressni bitta tartibli platformada birlashtiradi.</p>

            <div className="arkV2HeroActions">
              <Link href="/login?next=/mock" className="arkV2PrimaryButton">Mock testni boshlash <ArrowRight /></Link>
              <Link href="#platform" className="arkV2OutlineButton">Platformani ko‘rish</Link>
            </div>

            <div className="arkV2HeroMeta">
              <span><Check /> 4 ta IELTS skill</span>
              <span><Check /> IELTS + CEFR</span>
              <span><Check /> Natija va progress</span>
            </div>
          </div>

          <div className="arkV2ProductPreview" aria-label="ARK Education platform preview">
            <div className="arkV2PreviewTop">
              <div><span className="arkV2MiniLogo"><ArkLogoIcon /></span><p><strong>Dashboard</strong><small>Bugungi progress</small></p></div>
              <span className="arkV2PreviewStatus"><i /> Active</span>
            </div>

            <div className="arkV2PreviewHero">
              <div><small>HOZIRGI NATIJA</small><strong>6.5</strong><span>+0.5 so‘nggi 30 kunda</span></div>
              <div className="arkV2TargetRing"><span>Target</span><strong>8.0</strong></div>
            </div>

            <div className="arkV2SkillProgress">
              <div><span><b>R</b> Reading</span><em>7.0</em><i><b style={{ width: '78%' }} /></i></div>
              <div><span><b>L</b> Listening</span><em>6.5</em><i><b style={{ width: '70%' }} /></i></div>
              <div><span><b>W</b> Writing</span><em>6.0</em><i><b style={{ width: '61%' }} /></i></div>
              <div><span><b>S</b> Speaking</span><em>6.0</em><i><b style={{ width: '60%' }} /></i></div>
            </div>

            <div className="arkV2ContinueCard">
              <div><span>DAVOM ETTIRISH</span><strong>IELTS Reading • Test 06</strong><small>62% yakunlangan</small></div>
              <span className="arkV2ContinueArrow"><ArrowRight /></span>
            </div>
          </div>
        </section>

        <section className="arkV2Trust" aria-label="Platforma imkoniyatlari">
          <div><strong>4 Skills</strong><span>Reading, Listening, Writing, Speaking</span></div>
          <div><strong>2 Yo‘nalish</strong><span>IELTS va CEFR</span></div>
          <div><strong>Full Mock</strong><span>Real test oqimiga yaqin</span></div>
          <div><strong>Progress</strong><span>Natijalarni bir joyda kuzatish</span></div>
        </section>

        <section className="arkV2Skills" id="skills">
          <div className="arkV2SectionIntro">
            <span>4 KO‘NIKMA</span>
            <h2>Har bir skill uchun <em>aniq muhit.</em></h2>
            <p>Keraksiz dekoratsiyasiz. Har bir ko‘nikma o‘z vazifasiga mos, toza va fokuslangan interfeysda.</p>
          </div>

          <div className="arkV2SkillGrid">
            <article><span className="arkV2SkillIcon"><BookOpen /></span><small>01</small><h3>Reading</h3><p>Passage, highlight, savollar va review — bitta tartibli test oqimida.</p></article>
            <article><span className="arkV2SkillIcon"><Headphones /></span><small>02</small><h3>Listening</h3><p>4 part, audio oqimi va aniq navigation bilan diqqatni testda saqlang.</p></article>
            <article><span className="arkV2SkillIcon"><PenNib /></span><small>03</small><h3>Writing</h3><p>Task 1 va Task 2 uchun sodda yozish maydoni va submission tartibi.</p></article>
            <article><span className="arkV2SkillIcon"><Microphone /></span><small>04</small><h3>Speaking</h3><p>Part 1–3 practice, javob berish oqimi va oldingi mashqlar tarixi.</p></article>
          </div>
        </section>

        <section className="arkV2Platform" id="platform">
          <div className="arkV2PlatformCopy">
            <span>PLATFORMA</span>
            <h2>Faqat test emas.<br /><em>O‘sishni ko‘rsatadigan tizim.</em></h2>
            <p>Mock topshirishdan keyingi eng muhim narsa — nimani yaxshilash kerakligini tushunish. ARK natijalarni ko‘nikmalar bo‘yicha bir joyda ko‘rsatadi.</p>
            <ul>
              <li><Check /> So‘nggi natijalarni ko‘rish</li>
              <li><Check /> Skill bo‘yicha progressni kuzatish</li>
              <li><Check /> Keyingi practice’ga tez o‘tish</li>
            </ul>
          </div>

          <div className="arkV2AnalyticsPanel">
            <div className="arkV2AnalyticsTop"><div><Trend /><span><small>30 KUNLIK PROGRESS</small><strong>+12%</strong></span></div><em>IELTS</em></div>
            <div className="arkV2Bars" aria-hidden="true"><i style={{ height: '42%' }} /><i style={{ height: '55%' }} /><i style={{ height: '48%' }} /><i style={{ height: '68%' }} /><i style={{ height: '73%' }} /><i style={{ height: '88%' }} /></div>
            <div className="arkV2AnalyticsBottom"><span><small>Eng kuchli skill</small><strong>Reading • 7.0</strong></span><span><small>Keyingi fokus</small><strong>Writing • 6.0</strong></span></div>
          </div>
        </section>

        <section className="arkV2Steps">
          <div className="arkV2SectionIntro arkV2SectionIntroCompact">
            <span>QANDAY ISHLAYDI?</span>
            <h2>Uchta oddiy qadam.</h2>
          </div>
          <div className="arkV2StepGrid">
            <article><b>01</b><div><h3>Yo‘nalishni tanlang</h3><p>IELTS, CEFR yoki Full Mock ichidan keraklisini oching.</p></div></article>
            <article><b>02</b><div><h3>Testni bajaring</h3><p>Real formatga yaqin, fokuslangan test muhitida ishlang.</p></div></article>
            <article><b>03</b><div><h3>Natijani kuzating</h3><p>Progressni ko‘ring va keyingi practice’ni davom ettiring.</p></div></article>
          </div>
        </section>

        <section className="arkV2Faq" id="faq">
          <div className="arkV2FaqIntro">
            <span>FAQ</span>
            <h2>Ko‘p beriladigan savollar.</h2>
            <p>Platformadan foydalanishdan oldin bilishingiz kerak bo‘lgan asosiy ma’lumotlar.</p>
          </div>
          <div className="arkV2FaqList">
            {faqItems.map(([question, answer], index) => (
              <details key={question} className="arkV2FaqItem">
                <summary><span><b>{String(index + 1).padStart(2, '0')}</b>{question}</span><i /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="arkV2FinalCta">
          <div><span>ARK EDUCATION PLATFORM</span><h2>Keyingi natijangiz shu yerdan boshlanadi.</h2><p>Profilingizga kiring va birinchi practice yoki full mock testingizni boshlang.</p></div>
          <Link href="/login?next=/mock" className="arkV2LightButton">Platformaga kirish <ArrowRight /></Link>
        </section>
      </main>

      <footer className="arkV2Footer">
        <div className="arkV2FooterTop">
          <Link href="/" className="arkV2Brand" aria-label="ARK Education">
            <span className="arkV2BrandMark"><ArkLogoIcon /></span>
            <span className="arkV2BrandText"><strong>ARK Education</strong><small>IELTS &amp; CEFR PLATFORM</small></span>
          </Link>
          <nav><Link href="#skills">Ko‘nikmalar</Link><Link href="#platform">Platforma</Link><Link href="#faq">FAQ</Link><Link href="/login">Kirish</Link></nav>
        </div>
        <div className="arkV2FooterBottom"><p>© 2026 ARK Education Platform. All information reserved.</p><span>IELTS • CEFR • FULL MOCK</span></div>
      </footer>
    </div>
  );
}
