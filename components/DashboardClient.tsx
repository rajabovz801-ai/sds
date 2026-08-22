'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CloudTest } from '@/lib/cloudTests';

type Student = { firstName: string; lastName: string };
type NavItem = { href: string; label: string; icon: string; soon?: boolean };

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { href: '/practice', label: 'Practice', icon: '▦', soon: true },
  { href: '/mock', label: 'Mock tests', icon: '◎' },
  { href: '/ielts', label: 'IELTS', icon: 'I' },
  { href: '/cefr', label: 'CEFR', icon: 'C' },
  { href: '/study-tools', label: 'Study tools', icon: '✦', soon: true },
  { href: '/ai-tutor', label: 'AI Tutor', icon: '◇', soon: true },
];

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function initials(student: Student | null) {
  if (!student) return 'A';
  return `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase() || 'A';
}

export function DashboardClient() {
  const [tests, setTests] = useState<CloudTest[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [dark, setDark] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
    fetch('/api/public-tests')
      .then((response) => response.json())
      .then((data) => setTests(data.tests || []))
      .catch(() => setTests([]));
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));
  }, []);

  const published = useMemo(() => tests.filter((test) => test.status === 'published'), [tests]);
  const firstName = student?.firstName || 'Student';

  const calendar = useMemo(() => {
    if (!today) return { label: 'Calendar', cells: [] as Array<number | null>, day: -1 };
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const mondayOffset = (firstDay + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: days }, (_, index) => index + 1),
    ];
    return {
      label: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells,
      day: today.getDate(),
    };
  }, [today]);

  return (
    <div className={`arkDashboard${dark ? ' arkDashboardDark' : ''}`}>
      <aside className="dashSidebar">
        <Link href="/" className="dashBrand" aria-label="ARK bosh sahifa">
          <span className="dashBrandMark"><span>A</span></span>
          <span className="dashBrandText"><strong>ARK</strong><small>EXAM HUB</small></span>
        </Link>

        <nav className="dashNav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={item.href === '/dashboard' ? 'active' : ''}>
              <span className="dashNavIcon">{item.icon}</span>
              <span>{item.label}</span>
              {item.soon && <em>soon</em>}
            </Link>
          ))}
        </nav>

        <div className="dashSidebarBottom">
          <a href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">
            <span className="dashNavIcon">↗</span><span>Telegram channel</span>
          </a>
          <Link href="/login"><span className="dashNavIcon">⇥</span><span>Account</span></Link>
        </div>
      </aside>

      <main className="dashMain">
        <header className="dashTopbar">
          <div>
            <p className="dashMobileBrand">ARK EXAM HUB</p>
            <h1>Dashboard</h1>
          </div>
          <div className="dashTopActions">
            <span className="dashMiniStat">◉ <b>0</b></span>
            <span className="dashMiniStat">★ <b>0</b></span>
            <button type="button" className="dashIconButton" onClick={() => setDark((value) => !value)} aria-label="Rang rejimini almashtirish">{dark ? '☀' : '☾'}</button>
            <span className="dashLang">UZ</span>
            <Link href="/login" className="dashAvatar" aria-label="Profil">{initials(student)}</Link>
          </div>
        </header>

        <section className="dashWorkspace">
          <div className="dashPrimary">
            <section className="dashWelcomeCard">
              <div>
                <span className="dashWelcomeEyebrow">Good afternoon 👋</span>
                <h2>Welcome back, {firstName}</h2>
              </div>
              <div className="dashWelcomeMessage">Consistency is the key to<br /><strong>mastering any skill.</strong></div>
              <div className="dashWelcomeArt" aria-hidden="true">
                <span>◌</span><span>✦</span><span>▱</span><span>▦</span>
              </div>
            </section>

            <section className="dashMetrics" aria-label="Quick stats">
              <article className="dashMetric dashMetricMint"><span className="metricGlyph">◎</span><strong>8.0</strong><p>Target Band</p></article>
              <article><span className="metricGlyph violet">⌁</span><strong>—</strong><p>Avg Score</p></article>
              <article><span className="metricGlyph coral">▦</span><strong>{published.length}</strong><p>Available Tests</p></article>
              <article><span className="metricGlyph orange">◷</span><strong>0m</strong><p>Practice Time</p></article>
              <article><span className="metricGlyph green">♨</span><strong>1</strong><p>Day Streak</p></article>
            </section>

            <section className="dashPanel dashPerformance">
              <div className="dashPanelHead">
                <div><h3>Weekly Performance</h3><p>last 7 days</p></div>
                <span className="dashAverage">Start practicing</span>
              </div>
              <div className="dashTabs" aria-label="Performance filters">
                <button type="button">Practice time</button>
                <button type="button">Units practiced</button>
                <button type="button" className="active">Listening</button>
                <button type="button">Reading</button>
              </div>
              <div className="dashChart" aria-label="Weekly performance chart">
                <div className="chartY"><span>9</span><span>6.5</span><span>4.5</span><span>2.5</span><span>0</span></div>
                <svg viewBox="0 0 720 180" role="img" aria-label="No weekly score data yet">
                  <defs>
                    <linearGradient id="arkChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".2"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient>
                  </defs>
                  <g className="chartGrid"><line x1="0" y1="16" x2="720" y2="16"/><line x1="0" y1="56" x2="720" y2="56"/><line x1="0" y1="96" x2="720" y2="96"/><line x1="0" y1="136" x2="720" y2="136"/><line x1="0" y1="176" x2="720" y2="176"/></g>
                  <path className="chartArea" d="M0 176 L120 176 L240 176 L360 176 L480 176 L600 176 L720 176 L720 180 L0 180 Z" />
                  <path className="chartLine" d="M0 176 L120 176 L240 176 L360 176 L480 176 L600 176 L720 176" />
                </svg>
                <div className="chartDays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
              </div>
            </section>

            <section className="dashPanel dashTestsPanel">
              <div className="dashPanelHead">
                <div><h3>Continue practicing</h3><p>Published tests from the ARK library</p></div>
                <Link href="/mock">View all →</Link>
              </div>
              <div className="dashTestList">
                {published.length === 0 ? (
                  <div className="dashEmpty"><span>✦</span><div><strong>Your practice area is ready.</strong><p>Published tests will appear here automatically.</p></div></div>
                ) : published.slice(0, 4).map((test) => (
                  <Link href={`/test/${test.id}`} className="dashTestRow" key={test.id}>
                    <span className="dashTestBadge">{test.track.toUpperCase().slice(0, 2)}</span>
                    <span className="dashTestCopy"><strong>{test.title}</strong><small>{test.track.toUpperCase()} · {test.skill}</small></span>
                    <span className="dashTestArrow">→</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="dashSecondary">
            <section className="dashPanel dashCalendar">
              <div className="calendarHead"><strong>{calendar.label}</strong><div><button type="button" aria-label="Oldingi oy">‹</button><button type="button" aria-label="Keyingi oy">›</button></div></div>
              <div className="calendarWeek">{weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
              <div className="calendarGrid">
                {calendar.cells.map((day, index) => day ? <span key={`${day}-${index}`} className={day === calendar.day ? 'today' : ''}>{day}</span> : <span key={`blank-${index}`} className="blank" />)}
              </div>
            </section>

            <section className="dashPanel dashBadges">
              <div className="dashPanelHead compact"><div><h3>Badges</h3></div><span>0/6 earned</span></div>
              <div className="badgeGrid">
                <span className="badge coral">✦</span><span className="badge indigo">↗</span><span className="badge blue">✓</span>
                <span className="badge purple">☾</span><span className="badge lilac">◴</span><span className="badge muted">♨</span>
              </div>
              <div className="badgeProgress"><span>♨</span><p>Start a streak to unlock your first badge</p></div>
              <Link href="/dashboard" className="badgeMore">View all badges →</Link>
            </section>

            <section className="dashFocusCard">
              <span className="focusIcon">◎</span>
              <div><small>YOUR NEXT STEP</small><h3>Complete one full mock</h3><p>Use a timed test to establish your current baseline.</p></div>
              <Link href="/mock">Open mock →</Link>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
