'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardData, DashboardPoint } from '@/lib/dashboard';
import type { StudentSummary } from '@/lib/auth/server-session';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { BookOpenIcon, HeadphonesIcon, LayersIcon, LogOutIcon, MicIcon, PenToolIcon } from '@/components/UiIcons';

function bandLabel(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function Chart({ points, compact = false }: { points: DashboardPoint[]; compact?: boolean }) {
  const width = 720;
  const height = compact ? 180 : 260;
  const padX = 28;
  const padY = 26;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const coords = points.map((point, index) => {
    const x = padX + (points.length <= 1 ? usableW / 2 : (index / (points.length - 1)) * usableW);
    const value = point.value;
    const y = value === null ? null : padY + ((9 - value) / 5) * usableH;
    return { ...point, x, y };
  });
  const line = coords.filter((p) => p.y !== null).map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="dashChartWrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Natijalar grafigi">
        {[4, 5, 6, 7, 8, 9].map((v) => {
          const y = padY + ((9 - v) / 5) * usableH;
          return <g key={v}><line x1={padX} x2={width - padX} y1={y} y2={y} className="dashGridLine" /><text x={3} y={y + 4} className="dashAxisText">{v}</text></g>;
        })}
        {line && <polyline points={line} className="dashLine" />}
        {coords.map((p, i) => p.y === null ? null : <circle key={i} cx={p.x} cy={p.y} r={5} className="dashDot"><title>{p.label}: {p.value?.toFixed(1)}</title></circle>)}
      </svg>
      <div className="dashChartLabels">{points.map((p) => <span key={p.date}>{p.label}</span>)}</div>
    </div>
  );
}

function MetricCard({ icon, title, value, note, tone = 'blue' }: { icon: string; title: string; value: string; note: string; tone?: string }) {
  return <article className={`dashMetric dashTone-${tone}`}><span className="dashMetricIcon">{icon}</span><div><small>{title}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

export function DashboardClient({ student, initialData }: { student: StudentSummary; initialData: DashboardData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setRefreshing(true);
      try {
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        if (res.ok) {
          const next = await res.json() as DashboardData;
          if (!cancelled) setData(next);
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    const timer = window.setInterval(refresh, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  }

  const studyGoalPct = Math.min(100, (data.weeklyStudyHours / data.weeklyGoalHours) * 100);
  const progressPct = data.overallBand === null || data.nextTargetBand === null ? 0 : Math.min(100, (data.overallBand / data.nextTargetBand) * 100);
  const recentActivity = useMemo(() => data.recentResults.slice(0, 4), [data.recentResults]);

  return (
    <div className="dashRoot">
      <aside className="dashSidebar">
        <Link href="/mock" className="dashBrand"><span className="dashBrandMark"><ArkLogoIcon /></span><span><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span></Link>
        <nav className="dashNav">
          <Link className="active" href="/mock"><span>⌂</span> Dashboard</Link>
          <Link href="/ielts"><span>◎</span> IELTS</Link>
          <Link href="/cefr"><span>◇</span> CEFR</Link>
          <Link href="/practice"><span>✎</span> Practice <em>SOON</em></Link>
          <Link href="/study-tools"><span>⌘</span> Tools <em>SOON</em></Link>
        </nav>
        <div className="dashMotivation"><img src="/dashboard-assets/fast-learner.png" alt="" /><strong>Dream. Prepare. Achieve.</strong><p>Har kuni kichik qadam — katta natija.</p></div>
        <div className="dashUser"><span>{initials}</span><div><strong>{student.firstName} {student.lastName}</strong><small>● Online</small></div><button onClick={logout} aria-label="Chiqish"><LogOutIcon /></button></div>
      </aside>

      <main className="dashMain">
        <section className="dashHero">
          <div className="dashHeroCopy"><span>WELCOME BACK 👋</span><h1>Bugun nimani<br /><em>mashq qilamiz?</em></h1><p>Natijalaringiz, progress va yutuqlaringiz real vaqtga yaqin rejimda yangilanadi.</p></div>
          <img className="dashHeroArt" src="/dashboard-assets/study-hero.png" alt="Study achievement illustration" />
          <div className="dashBandRing" style={{ '--band': `${((data.overallBand || 0) / 9) * 360}deg` } as React.CSSProperties}><div><small>Current Band</small><strong>{bandLabel(data.overallBand)}</strong><span>Target {bandLabel(data.nextTargetBand)}</span></div></div>
        </section>

        <section className="dashMetrics">
          <MetricCard icon="🏆" title="Overall Band" value={bandLabel(data.overallBand)} note="Oxirgi skill natijalari" tone="violet" />
          <MetricCard icon="📘" title="Reading" value={bandLabel(data.readingBand)} note={data.readingAverage === null ? 'Natija kutilmoqda' : `Avg ${data.readingAverage.toFixed(1)}`} tone="blue" />
          <MetricCard icon="🎧" title="Listening" value={bandLabel(data.listeningBand)} note={data.listeningAverage === null ? 'Natija kutilmoqda' : `Avg ${data.listeningAverage.toFixed(1)}`} tone="green" />
          <MetricCard icon="⏱" title="Weekly Study" value={`${data.weeklyStudyHours.toFixed(1)} h`} note={`Goal ${data.weeklyGoalHours} h`} tone="purple" />
          <MetricCard icon="✅" title="Tests Completed" value={String(data.testsCompleted)} note={`${data.studyStreak} day streak`} tone="amber" />
        </section>

        <section className="dashContentGrid">
          <article className="dashPanel dashDaily"><header><div><h2>Daily Results</h2><p>Oxirgi 14 kunlik band natijalari</p></div><span className="dashLive"><i /> {refreshing ? 'Yangilanmoqda' : 'Jonli'}</span></header><Chart points={data.dailyResults} /></article>

          <div className="dashStack">
            <article className="dashPanel"><header><div><h2>Band Trend</h2><p>Oxirgi 8 hafta</p></div></header><Chart points={data.bandTrend} compact /></article>
            <article className="dashPanel"><header><div><h2>Section Comparison</h2><p>Skill kesimida</p></div></header><div className="dashSkillBars">
              <div><span>Reading</span><b>{bandLabel(data.readingAverage)}</b><i><em style={{ width: `${((data.readingAverage || 0) / 9) * 100}%` }} /></i></div>
              <div><span>Listening</span><b>{bandLabel(data.listeningAverage)}</b><i><em style={{ width: `${((data.listeningAverage || 0) / 9) * 100}%` }} /></i></div>
            </div></article>
          </div>
        </section>

        <section className="dashBottomGrid">
          <article className="dashPanel dashRecent"><header><div><h2>Recent Results</h2><p>Oxirgi testlar</p></div></header><div className="dashResultList">{data.recentResults.length ? data.recentResults.map((result) => <div className="dashResultRow" key={result.id}><span className="dashResultIcon">{result.skill === 'reading' ? <BookOpenIcon /> : result.skill === 'listening' ? <HeadphonesIcon /> : result.skill === 'writing' ? <PenToolIcon /> : result.skill === 'speaking' ? <MicIcon /> : <LayersIcon />}</span><div><strong>{result.title}</strong><small>{formatDate(result.date)} · {result.score}</small></div><b>{bandLabel(result.band)}</b></div>) : <p className="dashEmpty">Hali yakunlangan test yo‘q.</p>}</div></article>

          <article className="dashPanel dashProgress"><header><div><h2>Progress Summary</h2><p>Keyingi maqsad sari</p></div></header><div className="dashProgressCard"><span>Next Target Band</span><strong>{bandLabel(data.nextTargetBand)}</strong><p>Focus area: <b>{data.focusArea}</b></p><i><em style={{ width: `${progressPct}%` }} /></i><Link href={data.focusArea === 'Listening' ? '/ielts/listening' : '/ielts/reading'}>Practice boshlash →</Link></div></article>
        </section>

        <section className="dashPanel dashAchievements"><header><div><h2>Achievements</h2><p>Natijalarga qarab avtomatik ochiladi</p></div><strong>{data.unlockedAchievements} / {data.achievements.length} unlocked</strong></header><div className="dashAchievementGrid">{data.achievements.map((item) => <article className={item.unlocked ? 'unlocked' : 'locked'} key={item.id}><img src={`/dashboard-assets/${item.icon}.png`} alt="" /><div><strong>{item.title}</strong><p>{item.description}</p><i><em style={{ width: `${item.progress}%` }} /></i></div><span>{item.unlocked ? '✓' : '🔒'}</span></article>)}</div></section>
      </main>

      <aside className="dashRightbar">
        <section className="dashToday"><small>TODAY</small><strong>{new Intl.DateTimeFormat('uz-UZ', { timeZone: 'Asia/Tashkent', weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</strong><b>{new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)}</b></section>
        <section className="dashSideCard"><header><h3>Weekly Goal</h3><span>{Math.round(studyGoalPct)}%</span></header><strong>{data.weeklyStudyHours.toFixed(1)} / {data.weeklyGoalHours} h</strong><i><em style={{ width: `${studyGoalPct}%` }} /></i></section>
        <section className="dashSideCard"><header><h3>Recent Activity</h3><span className="dashLive"><i /> Live</span></header><div className="dashActivity">{recentActivity.length ? recentActivity.map((item) => <div key={item.id}><span>✓</span><p><strong>{item.skill} test</strong><small>{item.score} · Band {bandLabel(item.band)}</small></p></div>) : <p className="dashEmpty">Faollik hali yo‘q.</p>}</div></section>
        <section className="dashSideCard"><header><h3>Top Achievements</h3></header><div className="dashMiniAchievements">{data.achievements.filter((a) => a.unlocked).slice(0, 6).map((a) => <div key={a.id}><img src={`/dashboard-assets/${a.icon}.png`} alt="" /><span>{a.title}</span></div>)}</div></section>
      </aside>
    </div>
  );
}
