import Link from 'next/link';

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

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 18V10M12 18V6M18 18v-5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="arkGatePage">
      <div className="arkGateGlow arkGateGlowBlue" aria-hidden="true" />
      <div className="arkGateGlow arkGateGlowRed" aria-hidden="true" />

      <header className="arkGateHeader">
        <Link href="/" className="arkGateBrand" aria-label="ARK Education bosh sahifa">
          <span className="arkGateLogo">A</span>
          <span className="arkGateBrandCopy">
            <strong>ARK Education</strong>
            <small>IELTS &amp; English Learning Centre</small>
          </span>
        </Link>
        <span className="arkGateOfficial">OFFICIAL MOCK PLATFORM</span>
      </header>

      <main className="arkGateMain">
        <section className="arkGateLeft">
          <div className="arkGateKicker">ARK EDUCATION MOCK PLATFORM</div>
          <h1>
            <span>Real exam.</span>
            <span>Real progress.</span>
            <span className="red">Real results.</span>
          </h1>
          <p className="arkGateLead">Professional computer-based mock practice built to make exam day feel familiar.</p>

          <div className="arkGateBenefits">
            <div><i><ShieldIcon /></i><span>Secure student access</span></div>
            <div><i><ClockIcon /></i><span>Real IELTS timing</span></div>
            <div><i><BarsIcon /></i><span>Professional test experience</span></div>
          </div>
        </section>

        <section className="arkGateCenter" aria-label="ARK IELTS mock examination centre">
          <small>ARK EDUCATION MOCK EXAMINATION CENTRE</small>
          <div className="arkGateIelts">IELTS<sup>TM</sup></div>
          <strong>English for International Opportunity</strong>
          <span className="arkGateUnderline" aria-hidden="true" />
        </section>

        <section className="arkGateCard">
          <div className="arkGateCardHead">
            <div>
              <h2>Welcome back</h2>
              <p>Imtihon platformasiga kirish yoki yangi hisob yaratish uchun quyidagi tugmadan foydalaning.</p>
            </div>
            <span className="arkGateLock"><LockIcon /></span>
          </div>

          <div className="arkGateRegisterBlock">
            <label>Ro‘yxatdan o‘tish</label>
            <Link className="arkGateRegisterField" href="/login">
              <span>Ro‘yxatdan o‘tish</span>
              <b>→</b>
            </Link>
          </div>

          <Link className="arkGateEnter" href="/mock">ENTER MOCK EXAM</Link>

          <div className="arkGateNote">
            <span><ShieldIcon /></span>
            <p>Ro‘yxatdan o‘tgan o‘quvchilar mock platformaga xavfsiz kiradi.</p>
          </div>
        </section>
      </main>

      <footer className="arkGateFooter">
        <span><b>Powered by Bilimly AI</b></span>
        <i>•</i>
        <span>Academic Platform by Rajabov Zuhriddin</span>
        <i>•</i>
        <span>© 2026 ARK Education</span>
      </footer>
    </div>
  );
}
