import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="arkOnePage">
      <div className="arkOneShell">
        <header className="arkOneHeader">
          <Link href="/" className="arkOneBrand" aria-label="ARK EDUCATION home">
            <span className="arkOneLogo">A</span>
            <span><strong>ARK EDUCATION</strong><small>MOCK EXAM PLATFORM</small></span>
          </Link>

          <nav className="arkOneNav" aria-label="Landing navigation">
            <span className="active">Home</span>
            <Link href="/mock">Mock Exam</Link>
            <Link href="/login">Login</Link>
          </nav>

          <Link className="arkOneTopCta" href="/mock">Start Mock <span>→</span></Link>
        </header>

        <main className="arkOneMain">
          <section className="arkOneIntro">
            <div className="arkOneEyebrow"><i /> PROFESSIONAL EXAM PRACTICE</div>
            <h1>Your Mock Platform.</h1>
            <p>One focused place for realistic exam practice. Choose your path and enter a clean, professional mock environment.</p>

            <div className="arkOneChoiceHead">
              <span>CHOOSE YOUR PATH</span>
              <small>IELTS or CEFR</small>
            </div>

            <div className="arkOneChoices">
              <Link href="/ielts" className="arkOneChoice arkOneChoiceDark">
                <div className="arkOneChoiceTop"><span>01</span><b>IELTS</b></div>
                <h2>IELTS Mock</h2>
                <p>Reading · Listening · Writing · Speaking</p>
                <div className="arkOneChoiceBottom"><small>Open platform</small><span>↗</span></div>
              </Link>

              <Link href="/cefr" className="arkOneChoice arkOneChoiceLime">
                <div className="arkOneChoiceTop"><span>02</span><b>CEFR</b></div>
                <h2>CEFR Mock</h2>
                <p>Level-based practice · A2 to C1</p>
                <div className="arkOneChoiceBottom"><small>Open platform</small><span>↗</span></div>
              </Link>
            </div>

            <div className="arkOneMiniTrust">
              <span>✓ Real exam flow</span>
              <span>✓ Focused interface</span>
              <span>✓ Progress ready</span>
            </div>
          </section>

          <section className="arkOneVisual" aria-label="ARK mock platform preview">
            <div className="arkOneDashboard">
              <aside className="arkOneDashSide">
                <div className="arkOneDashBrand"><span>A</span><b>ARK</b></div>
                <div className="arkOneDashMenu active"><span>▦</span><b>Dashboard</b></div>
                <div className="arkOneDashMenu"><span>◫</span><b>Mock Tests</b></div>
                <div className="arkOneDashMenu"><span>◉</span><b>Results</b></div>
                <div className="arkOneDashMenu"><span>✦</span><b>Progress</b></div>
                <div className="arkOneDashMenu"><span>⚙</span><b>Settings</b></div>

                <div className="arkOneDashPromo">
                  <span>ARK+</span>
                  <strong>Full mock mode</strong>
                  <small>Train with a complete exam workflow.</small>
                  <button type="button" tabIndex={-1}>Open mock ↗</button>
                </div>
              </aside>

              <div className="arkOneDashContent">
                <div className="arkOneDashTop">
                  <div className="arkOneSearch"><span>⌕</span><small>Search tests</small></div>
                  <div className="arkOneDashProfile"><span>◌</span><b>Student</b><i>A</i></div>
                </div>

                <div className="arkOneDashHeading">
                  <div><h3>Your Mock Platform</h3><p>Exam performance overview</p></div>
                  <button type="button" tabIndex={-1}>View report ↗</button>
                </div>

                <div className="arkOneMetrics">
                  <article><span>◎</span><div><strong>7.5</strong><small>Target band</small></div><b>↗</b></article>
                  <article><span>✓</span><div><strong>12</strong><small>Mocks done</small></div><b>↗</b></article>
                  <article><span>◷</span><div><strong>68%</strong><small>Progress</small></div><b>↗</b></article>
                </div>

                <div className="arkOneDashGrid">
                  <article className="arkOneChartCard">
                    <div className="arkOneCardHead"><div><strong>Skill Performance</strong><small>Last 7 days</small></div><span>IELTS</span></div>
                    <div className="arkOneBars">
                      <i style={{height:'44%'}}/><i style={{height:'70%'}}/><i style={{height:'58%'}}/><i style={{height:'82%'}}/><i style={{height:'66%'}}/><i style={{height:'90%'}}/>
                    </div>
                    <div className="arkOneBarLabels"><span>R</span><span>L</span><span>W</span><span>S</span><span>M</span><span>T</span></div>
                  </article>

                  <article className="arkOneLineCard">
                    <div className="arkOneCardHead"><div><strong>Weekly Score</strong><small>Mock trend</small></div><span>7.5</span></div>
                    <svg viewBox="0 0 460 180" aria-hidden="true">
                      <g><line x1="0" y1="35" x2="460" y2="35"/><line x1="0" y1="90" x2="460" y2="90"/><line x1="0" y1="145" x2="460" y2="145"/></g>
                      <path d="M0 130 C55 102 80 115 125 88 S205 62 255 84 S340 52 395 58 S440 42 460 50" />
                      <circle cx="255" cy="84" r="5" />
                    </svg>
                  </article>

                  <article className="arkOneRecentCard">
                    <div className="arkOneCardHead"><div><strong>Recent Tests</strong><small>Latest activity</small></div><span>View all</span></div>
                    <div className="arkOneRecentRow"><b>01</b><span>IELTS Reading Mock</span><em>32/40</em></div>
                    <div className="arkOneRecentRow"><b>02</b><span>Listening Practice</span><em>30/40</em></div>
                    <div className="arkOneRecentRow"><b>03</b><span>CEFR Level Test</span><em>B2</em></div>
                  </article>

                  <article className="arkOneFocusCard">
                    <small>NEXT STEP</small>
                    <strong>Complete one full mock.</strong>
                    <p>Use a timed exam to establish your current baseline.</p>
                    <span>Start now →</span>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
