import Link from 'next/link';
import { LandingAccessCard } from '@/components/LandingAccessCard';

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
}
function BookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z"/><path d="M4 18.5A3.5 3.5 0 0 1 7.5 15H20"/></svg>;
}
function HeadphoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/></svg>;
}
function PenIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.9-10.9-3.2-3.2L5 15.8 4 20Z"/><path d="m14.8 6 3.2 3.2"/></svg>;
}
function MicIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.7v5.4c0 4.2 2.6 7.7 6.5 9.9 3.9-2.2 6.5-5.7 6.5-9.9V5.7L12 3Z"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></svg>;
}

const ieltsCards = [
  { href: '/ielts/listening', icon: <HeadphoneIcon />, title: 'Listening', copy: 'IELTS listening mock tests', meta: 'Audio · 40 questions', tone: 'blue' },
  { href: '/ielts/reading', icon: <BookIcon />, title: 'Reading', copy: 'Academic reading practice', meta: '60 min · 40 questions', tone: 'green' },
  { href: '/ielts/writing', icon: <PenIcon />, title: 'Writing', copy: 'Task 1 & Task 2 practice', meta: 'Academic writing', tone: 'orange' },
];

export default function HomePage() {
  return (
    <div className="peakPage">
      <aside className="peakSidebar">
        <Link href="/" className="peakBrand">
          <span className="peakBrandMark">A</span>
          <span><strong>ARK Mock</strong><small>Education Platform</small></span>
        </Link>

        <nav className="peakNav" aria-label="Platform navigation">
          <span className="peakNavLabel">PLATFORM</span>
          <Link href="/" className="active"><i><HomeIcon /></i><span>Dashboard</span></Link>
          <Link href="/ielts"><i><BookIcon /></i><span>IELTS</span></Link>
          <Link href="/cefr"><i><MicIcon /></i><span>CEFR</span></Link>
        </nav>

        <div className="peakSidebarBottom">
          <div className="peakSecureMini"><i><ShieldIcon /></i><span><strong>Secure platform</strong><small>Telegram verified access</small></span></div>
          <p>© 2026 ARK Education</p>
        </div>
      </aside>

      <main className="peakMain">
        <header className="peakTopbar">
          <div>
            <span className="peakEyebrow">ARK EDUCATION</span>
            <h1>Mock Dashboard</h1>
          </div>
          <div className="peakTopActions">
            <span className="peakOfficial"><i /> Official platform</span>
            <Link href="/mock" className="peakTopButton">Open Mock <ArrowIcon /></Link>
          </div>
        </header>

        <section className="peakWelcome">
          <div className="peakWelcomeCopy">
            <span className="peakHello">WELCOME TO ARK MOCK</span>
            <h2>Practice like the real exam.</h2>
            <p>IELTS va CEFR mock testlarini bitta tartibli platformada ishlang. Real exam flow, secure access va professional test experience.</p>
            <div className="peakWelcomeFacts">
              <span><b>IELTS</b><small>Listening · Reading · Writing</small></span>
              <span><b>CEFR</b><small>Speaking practice</small></span>
              <span><b>Secure</b><small>One-time Telegram access</small></span>
            </div>
          </div>

          <div className="peakAccessCard">
            <div className="peakAccessHead">
              <span>STUDENT ACCESS</span>
              <strong>Continue your session</strong>
            </div>
            <LandingAccessCard />
          </div>
        </section>

        <section className="peakSection">
          <div className="peakSectionHead">
            <div><span>IELTS MOCK</span><h2>Choose a section</h2></div>
            <small>3 sections available</small>
          </div>

          <div className="peakCardGrid">
            {ieltsCards.map((card) => (
              <Link href={card.href} className={`peakPracticeCard ${card.tone}`} key={card.title}>
                <div className="peakPracticeTop">
                  <i>{card.icon}</i>
                  <span>IELTS</span>
                </div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </div>
                <div className="peakPracticeBottom"><small>{card.meta}</small><b><ArrowIcon /></b></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="peakSection peakCefrSection">
          <div className="peakSectionHead">
            <div><span>CEFR</span><h2>Speaking practice</h2></div>
            <small>1 section available</small>
          </div>
          <Link href="/cefr/speaking" className="peakCefrCard">
            <i><MicIcon /></i>
            <div><span>CEFR SPEAKING</span><h3>Speaking Mock & Practice</h3><p>Level-based speaking tasks and structured practice.</p></div>
            <b><ArrowIcon /></b>
          </Link>
        </section>

        <footer className="peakFooter">Powered by Bilimly AI · ARK Education Mock Platform</footer>
      </main>
    </div>
  );
}
