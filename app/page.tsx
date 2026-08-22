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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8c.8 5.2 4 8.3 9.2 9.2-5.2.8-8.4 4-9.2 9.2-.8-5.2-4-8.4-9.2-9.2 5.2-.9 8.4-4 9.2-9.2Z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="arkGatePage arkIosPage">
      <LandingMotion />

      <div className="arkIosBackdrop" aria-hidden="true">
        <span className="arkIosOrb arkIosOrbBlue" />
        <span className="arkIosOrb arkIosOrbRed" />
        <span className="arkIosOrb arkIosOrbViolet" />
        <span className="arkIosNoise" />
      </div>

      <header className="arkIosNavWrap" data-reveal>
        <div className="arkIosNav arkIosGlass">
          <Link href="/" className="arkIosBrand" aria-label="ARK Education bosh sahifa">
            <span className="arkIosLogo">A</span>
            <span className="arkIosBrandCopy">
              <strong>ARK Education</strong>
              <small>IELTS &amp; English Learning Centre</small>
            </span>
          </Link>

          <div className="arkIosNavStatus">
            <span className="arkIosLiveDot" />
            <span>Secure student gateway</span>
          </div>

          <span className="arkIosOfficial">OFFICIAL MOCK PLATFORM</span>
        </div>
      </header>

      <main className="arkIosHero">
        <section className="arkIosCopy" data-reveal>
          <div className="arkIosKicker arkIosGlassSoft">
            <span><SparkIcon /></span>
            ARK EDUCATION MOCK PLATFORM
          </div>

          <h1>
            <span>Real exam.</span>
            <span>Real progress.</span>
            <span className="accent">Real results.</span>
          </h1>

          <p className="arkIosLead">
            Professional computer-based mock practice designed to make exam day feel familiar, focused and measurable.
          </p>

          <div className="arkIosBenefits">
            <div className="arkIosBenefit arkIosGlassSoft">
              <i><ShieldIcon /></i>
              <span><strong>Secure access</strong><small>Telegram verified session</small></span>
            </div>
            <div className="arkIosBenefit arkIosGlassSoft">
              <i><ClockIcon /></i>
              <span><strong>Real timing</strong><small>Authentic exam flow</small></span>
            </div>
            <div className="arkIosBenefit arkIosGlassSoft">
              <i><WaveIcon /></i>
              <span><strong>Exam experience</strong><small>Focused test interface</small></span>
            </div>
          </div>
        </section>

        <section className="arkIosProduct" aria-label="ARK IELTS mock examination preview" data-reveal>
          <div className="arkIosProductHalo" aria-hidden="true" />

          <div className="arkIosStage arkIosGlass" data-tilt>
            <div className="arkIosStageTop">
              <div className="arkIosStageBrand">
                <span>A</span>
                <div><strong>ARK MOCK</strong><small>IELTS Academic</small></div>
              </div>
              <div className="arkIosStageTimer"><ClockIcon /><span>59:42</span></div>
            </div>

            <div className="arkIosSkillTabs">
              <span>Listening</span>
              <span className="active">Reading</span>
              <span>Writing</span>
            </div>

            <div className="arkIosExamCanvas">
              <article className="arkIosPassage">
                <div className="arkIosMeta"><span>PASSAGE 1</span><b>Academic Reading</b></div>
                <h2>The future of learning</h2>
                <p>
                  Modern assessment environments are increasingly designed to measure not only knowledge, but also a candidate&apos;s ability to work accurately under realistic conditions.
                </p>
                <p>
                  A carefully structured interface can help students become <mark>familiar with the rhythm of a real examination</mark> before test day.
                </p>
                <div className="arkIosTextLines" aria-hidden="true"><i /><i /><i /><i /></div>
              </article>

              <aside className="arkIosQuestion">
                <div className="arkIosMeta"><span>QUESTION 4</span><b>Multiple choice</b></div>
                <h3>What is the main purpose of the interface?</h3>
                <label><i>A</i><span>To shorten the examination</span></label>
                <label className="selected"><i>B</i><span>To recreate realistic test conditions</span></label>
                <label><i>C</i><span>To remove time limits</span></label>
                <div className="arkIosQuestionRail"><span className="done">1</span><span className="done">2</span><span>3</span><span className="current">4</span><span>5</span></div>
              </aside>
            </div>

            <div className="arkIosStageFooter">
              <span><i className="arkIosLiveDot" /> Session protected</span>
              <strong>ARK EDUCATION</strong>
              <span>Exam mode <b>ON</b></span>
            </div>
          </div>

          <div className="arkIosFloat arkIosFloatScore arkIosGlass">
            <small>TARGET BAND</small>
            <strong>8.0</strong>
            <span>IELTS Academic</span>
          </div>

          <div className="arkIosFloat arkIosFloatSecure arkIosGlass">
            <i><LockIcon /></i>
            <span><strong>Secure mode</strong><small>Identity verified</small></span>
          </div>
        </section>

        <section className="arkGateCard arkIosAccess arkIosGlass" data-reveal>
          <div className="arkGateCardHead arkIosAccessHead">
            <div>
              <span className="arkIosAccessEyebrow">STUDENT ACCESS</span>
              <h2>Welcome back</h2>
              <p>Telegram orqali tasdiqlangan bir martalik kod bilan xavfsiz sessiyaga kiring.</p>
            </div>
            <span className="arkGateLock arkIosLock"><LockIcon /></span>
          </div>

          <LandingAccessCard />
        </section>
      </main>

      <footer className="arkIosFooter">
        <span><b>Powered by Bilimly AI</b></span>
        <i>•</i>
        <span>Academic Platform by Rajabov Zuhriddin</span>
        <i>•</i>
        <span>© 2026 ARK Education</span>
      </footer>
    </div>
  );
}
