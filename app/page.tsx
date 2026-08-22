import Link from 'next/link';
import { LandingAccessCard } from '@/components/LandingAccessCard';
import { LandingMotion } from '@/components/LandingMotion';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 10V7.8a4.5 4.5 0 0 1 9 0V10" />
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M12 14v2.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5.5 5.7v5.4c0 4.2 2.6 7.7 6.5 9.9 3.9-2.2 6.5-5.7 6.5-9.9V5.7L12 3Z" />
      <path d="m9.5 12 1.7 1.7 3.5-3.7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 14v-4M8 18V6M12 16V8M16 19V5M20 14v-4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="arkHomeV4">
      <LandingMotion />

      <div className="arkHomeAmbient" aria-hidden="true">
        <span className="arkHomeOrb blue" />
        <span className="arkHomeOrb red" />
        <span className="arkHomeOrb violet" />
      </div>

      <header className="arkHomeNav" data-reveal>
        <Link href="/" className="arkHomeBrand" aria-label="ARK Education bosh sahifa">
          <span className="arkHomeLogo">A</span>
          <span>
            <strong>ARK Education</strong>
            <small>IELTS &amp; English Learning Centre</small>
          </span>
        </Link>
        <div className="arkHomeNavMeta">
          <span className="arkHomeSecureDot" />
          <span>Secure student gateway</span>
          <b>OFFICIAL MOCK PLATFORM</b>
        </div>
      </header>

      <main className="arkHomeShell" data-reveal>
        <section className="arkHomeIntro">
          <div className="arkHomeIntroCopy">
            <span className="arkHomeEyebrow">ARK EDUCATION MOCK PLATFORM</span>
            <h1>
              Real exam. <span>Real progress.</span>
              <em>Real results.</em>
            </h1>
            <p>Professional computer-based mock practice designed to make exam day feel familiar, focused and measurable.</p>

            <div className="arkHomeTrust">
              <span><i><ShieldIcon /></i><b>Secure access</b></span>
              <span><i><ClockIcon /></i><b>Real timing</b></span>
              <span><i><WaveIcon /></i><b>Exam experience</b></span>
            </div>
          </div>

          <aside className="arkHomeAccess">
            <div className="arkHomeAccessTop">
              <div>
                <span>STUDENT ACCESS</span>
                <h2>Welcome back</h2>
                <p>Telegram orqali tasdiqlangan kod bilan xavfsiz sessiyaga kiring.</p>
              </div>
              <i className="arkHomeLock"><LockIcon /></i>
            </div>
            <LandingAccessCard />
          </aside>
        </section>

        <section className="arkHomePreview" data-tilt aria-label="IELTS mock test interface preview">
          <div className="arkHomePreviewBar">
            <div className="arkHomePreviewBrand">
              <span>A</span>
              <div><strong>ARK MOCK</strong><small>IELTS Academic</small></div>
            </div>
            <div className="arkHomeTabs">
              <span>Listening</span>
              <span className="active">Reading</span>
              <span>Writing</span>
            </div>
            <div className="arkHomeTimer"><ClockIcon /><b>59:42</b></div>
          </div>

          <div className="arkHomeExam">
            <article className="arkHomePassage">
              <div className="arkHomeMeta"><span>PASSAGE 1</span><b>ACADEMIC READING</b></div>
              <h3>The future of learning</h3>
              <p>Modern assessment environments are increasingly designed to measure not only knowledge, but also a candidate&apos;s ability to work accurately under realistic conditions.</p>
              <p>A carefully structured interface can help students become <mark>familiar with the rhythm of a real examination</mark> before test day.</p>
              <div className="arkHomeLines"><i /><i /><i /></div>
            </article>

            <aside className="arkHomeQuestion">
              <div className="arkHomeMeta"><span>QUESTION 4</span><b>MULTIPLE CHOICE</b></div>
              <h4>What is the main purpose of the interface?</h4>
              <label><i>A</i><span>To shorten the examination</span></label>
              <label className="selected"><i>B</i><span>To recreate realistic test conditions</span></label>
              <label><i>C</i><span>To remove time limits</span></label>
              <div className="arkHomeRail"><span className="done">1</span><span className="done">2</span><span>3</span><span className="current">4</span><span>5</span></div>
            </aside>
          </div>

          <div className="arkHomePreviewFoot">
            <span><i className="arkHomeSecureDot" /> Session protected</span>
            <strong>ARK EDUCATION</strong>
            <span>Exam mode <b>ON</b></span>
          </div>
        </section>
      </main>

      <footer className="arkHomeFooter">
        <span><b>Powered by Bilimly AI</b></span>
        <i>•</i>
        <span>Academic Platform by Rajabov Zuhriddin</span>
        <i>•</i>
        <span>© 2026 ARK Education</span>
      </footer>
    </div>
  );
}
