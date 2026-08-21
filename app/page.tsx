import { Header } from '@/components/Header';
import { ProgramCard } from '@/components/ProgramCard';
import { programs } from '@/data/programs';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="welcomeHero">
          <div className="heroOrb heroOrbOne" />
          <div className="heroOrb heroOrbTwo" />
          <div className="shell welcomeInner">
            <span className="eyebrow light">ARK EDUCATION • MOCK PLATFORM</span>
            <h1>Xush kelibsiz.</h1>
            <p className="heroText">Imtihon formatida practice qiling, natijangizni kuzating va o‘zingizga mos yo‘nalishni tanlang.</p>
            <div className="heroMeta">
              <span><b>IELTS</b> full mock & practice</span>
              <span><b>CEFR</b> A2 → C1</span>
              <span><b>Progress</b> tracking</span>
            </div>
          </div>
        </section>

        <section className="selectionSection">
          <div className="shell">
            <div className="sectionTitle largeGap">
              <div>
                <span className="eyebrow">YO‘NALISH</span>
                <h2>Bo‘limni tanlang</h2>
                <p className="sectionLead">Hozir qaysi imtihonga tayyorlanayotgan bo‘lsangiz, shu bo‘limdan davom eting.</p>
              </div>
            </div>
            <div className="programGrid">
              {programs.map((program) => <ProgramCard key={program.slug} {...program} />)}
            </div>
          </div>
        </section>

        <section className="howSection">
          <div className="shell howGrid">
            <div><span className="eyebrow light">QANDAY ISHLAYDI?</span><h2>3 ta oddiy qadam</h2></div>
            <div className="howSteps">
              <article><span>01</span><h3>Yo‘nalishni tanlang</h3><p>IELTS yoki CEFR bo‘limiga kiring.</p></article>
              <article><span>02</span><h3>Telegram orqali ro‘yxatdan o‘ting</h3><p>Bot siz tanlagan yo‘nalishni avtomatik oladi.</p></article>
              <article><span>03</span><h3>Mock testni boshlang</h3><p>Practice, result va keyingi testlar bitta platformada.</p></article>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
