import Link from 'next/link';
import { LandingAccessCard } from '@/components/LandingAccessCard';

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

export default function HomePage() {
  return (
    <div className="peakHeroPage">
      <header className="peakHeroNavShell">
        <nav className="peakHeroNav">
          <Link href="/" className="peakHeroBrand" aria-label="ARK Education bosh sahifa">
            <span className="peakHeroBrandMark">A</span>
            <span className="peakHeroBrandCopy"><strong>ARK Education</strong><small>IELTS &amp; English Learning Centre</small></span>
          </Link>

          <div className="peakHeroLinks" aria-label="Landing navigation">
            <Link href="/ielts">IELTS</Link>
            <Link href="/cefr">CEFR</Link>
            <Link href="/mock">Mock tests</Link>
            <a href="#access">Access</a>
          </div>

          <div className="peakHeroNavActions">
            <a className="peakHeroSignIn" href="#access">Kirish</a>
            <Link className="peakHeroSignup" href="/mock">Mock boshlash</Link>
          </div>
        </nav>
      </header>

      <main className="peakHeroMain">
        <section className="peakHeroCopy">
          <div className="peakHeroEyebrow">ARK EDUCATION MOCK PLATFORM</div>
          <h1>Reach your IELTS <em>target.</em></h1>
          <p className="peakHeroLead">Real IELTS &amp; CEFR mock practice.<br />Clear progress. Better results.</p>

          <div className="peakHeroMicro">
            <span>Fast</span><i>•</i><span>Accurate</span><i>•</i><span>Exam-style</span>
          </div>

          <div className="peakHeroActions">
            <Link href="/mock" className="peakHeroPrimary">Start mock test <b><ArrowIcon /></b></Link>
            <Link href="/ielts" className="peakHeroSecondary">Explore practice</Link>
          </div>

          <div className="peakHeroAccess" id="access">
            <LandingAccessCard />
          </div>
        </section>

        <section className="peakHeroVisual" aria-label="IELTS and CEFR practice visual">
          <div className="peakHeroGlow" aria-hidden="true" />
          <div className="peakHeroChevrons" aria-hidden="true"><span></span><span></span></div>
          <div className="peakHeroBase" aria-hidden="true" />

          <div className="peakHeroBook">
            <span className="peakHeroBookTop">IELTS<br />&amp; CEFR</span>
            <span className="peakHeroBookMark">A</span>
            <span className="peakHeroBookLine" />
            <small>ARK EDUCATION</small>
          </div>

          <div className="peakHeroSkill peakHeroReading">
            <i><BookIcon /></i><strong>READING</strong>
          </div>
          <div className="peakHeroSkill peakHeroListening">
            <i><HeadphoneIcon /></i><strong>LISTENING</strong>
          </div>
          <div className="peakHeroSkill peakHeroWriting">
            <i><PenIcon /></i><strong>WRITING</strong>
          </div>
          <div className="peakHeroSkill peakHeroSpeaking">
            <i><MicIcon /></i><strong>SPEAKING</strong>
          </div>

          <div className="peakHeroTarget">
            <span>TARGET</span><strong>8.0</strong><small>IELTS BAND</small>
          </div>
        </section>
      </main>

      <div className="peakHeroBottomLine" aria-hidden="true" />
    </div>
  );
}
