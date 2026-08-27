'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  AwardIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  ChecklistIcon,
  ClockIcon,
  FlameIcon,
  GlobeIcon,
  HeadphonesIcon,
  LayersIcon,
  LayoutGridIcon,
  LogOutIcon,
  SparklesIcon,
  TargetIcon,
  ZapIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import type { DashboardData, DashboardPoint } from '@/lib/dashboard';
import { achievementAssets } from '@/components/achievementAssets';

function fmtBand(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

function bandLabel(value: number | null) {
  if (value === null) return 'Natija kutilmoqda';
  if (value >= 8) return 'Excellent';
  if (value >= 7) return 'Good User';
  if (value >= 6) return 'Competent';
  return 'Developing';
}

function AchievementGlyph({ id }: { id: string }) {
  switch (id) {
    case 'first-test': return <CheckCircleIcon />;
    case 'streak': return <FlameIcon />;
    case 'reading-master': return <BookOpenIcon />;
    case 'listening-boost': return <HeadphonesIcon />;
    case 'ten-tests': return <ChecklistIcon />;
    case 'accuracy-ace': return <TargetIcon />;
    case 'band-seven': return <AwardIcon />;
    case 'perfect-section': return <SparklesIcon />;
    case 'fast-finisher': return <ZapIcon />;
    case 'consistency': return <CalendarCheckIcon />;
    default: return <SparklesIcon />;
  }
}

function MiniLine({ points, height = 190 }: { points: DashboardPoint[]; height?: number }) {
  const values = points.map((p) => p.value);
  const real = values.filter((v): v is number => v !== null);
  if (!real.length) return <div className="dashNoData">Hali natija yo‘q</div>;
  const width = 760;
  const padX = 24;
  const padY = 22;
  const min = Math.max(0, Math.min(...real) - 0.5);
  const max = Math.min(9, Math.max(...real) + 0.5);
  const span = Math.max(1, max - min);
  const coords = points.map((p, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(1, points.length - 1);
    const y = p.value === null ? null : padY + ((max - p.value) / span) * (height - padY * 2);
    return { x, y, value: p.value, label: p.label };
  });
  const segments: string[] = [];
  let current: string[] = [];
  for (const point of coords) {
    if (point.y === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${point.x},${point.y}`);
    }
  }
  if (current.length > 1) segments.push(current.join(' '));

  return (
    <div className="dashChartWrap">
      <div className="dashPlotArea">
        <svg className="dashLineChart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Natijalar grafigi">
          {[0, 1, 2, 3].map((i) => <line key={i} x1="18" x2={width - 18} y1={24 + i * ((height - 48) / 3)} y2={24 + i * ((height - 48) / 3)} className="dashGridLine" />)}
          {segments.map((segment, i) => <polyline key={i} points={segment} className="dashLine" />)}
        </svg>
        <div className="dashPointLayer" aria-hidden="true">
          {coords.map((point, i) => point.y === null ? null : (
            <span key={i} className="dashPointMarker" style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}>
              <b>{point.value?.toFixed(1)}</b><i />
            </span>
          ))}
        </div>
      </div>
      <div className="dashChartLabels">{points.map((p) => <span key={`${p.date}-${p.label}`}>{p.label}</span>)}</div>
    </div>
  );
}

function SmallTrend({ points }: { points: DashboardPoint[] }) {
  const real = points.filter((p) => p.value !== null);
  if (!real.length) return <div className="dashNoData dashNoDataSmall">Hali trend yo‘q</div>;
  return <MiniLine points={points} height={130} />;
}

type StudentDashboardClientProps = {
  student: StudentSummary;
  initialData: DashboardData;
  previewMode?: boolean;
  onExitPreview?: () => void;
};

export function StudentDashboardClient({ student, initialData: initialData, previewMode = false, onExitPreview }: StudentDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [clock, setClock] = useState(new Date());
  const [live, setLive] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!res.ok) throw new Error('refresh failed');
        const next = await res.json() as DashboardData;
        if (!cancelled) {
          setData(next);
          setLive(true);
        }
      } catch {
        if (!cancelled) setLive(false);
      }
    }
    const interval = window.setInterval(refresh, 8000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [previewMode]);

  async function logout() {
    if (previewMode || loggingOut) return;
    setLoggingOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); }
    finally { router.replace('/'); router.refresh(); }
  }

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';
  const studyPct = Math.min(100, Math.round((data.weeklyStudyHours / data.weeklyGoalHours) * 100));
  const nextGap = data.overallBand === null || data.nextTargetBand === null ? null : Math.max(0, data.nextTargetBand - data.overallBand);
  const todayLabel = new Intl.DateTimeFormat('uz-UZ', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(clock);
  const timeLabel = new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(clock);
  const recent = useMemo(() => data.recentResults, [data.recentResults]);
  const totalPts = 0;

  return (
    <div className="studentDashboardShell">
      <aside className="studentSidebar">
        <Link href="/mock" className="studentBrand"><span className="studentBrandMark"><ArkLogoIcon /></span><span><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span></Link>
        <nav className="studentSideNav">
          <Link className="active" href="/mock"><LayoutGridIcon /><span>Dashboard</span></Link>
          <Link href="/ielts"><GlobeIcon /><span>IELTS</span></Link>
          <Link href="/cefr"><LayersIcon /><span>CEFR</span></Link>
          <Link href="/practice"><BookOpenIcon /><span>Practice</span><small>SOON</small></Link>
          <Link href="/study-tools"><SparklesIcon /><span>Tools</span><small>SOON</small></Link>
          <Link href="/daily-tasks"><CalendarCheckIcon /><span>Daily Tasks</span></Link>
          <Link href="/leaderboard"><AwardIcon /><span>Leaderboard</span></Link>
        </nav>
        <Link className="studentSideDailySummary" href="/daily-tasks">
          <span className="studentSideDailyIcon"><CalendarCheckIcon /></span>
          <div><small>DAILY TASKS</small><strong>{totalPts} PTS</strong><em><FlameIcon /> {data.studyStreak} kun streak</em></div>
          <b>→</b>
        </Link>
        <div className="studentSideProfile"><span>{initials}</span><div><small>{previewMode ? 'ADMIN PREVIEW' : 'STUDENT'}</small><strong>{student.firstName} {student.lastName}</strong></div><button type="button" onClick={logout} disabled={previewMode || loggingOut} aria-label={previewMode ? 'Admin preview' : 'Chiqish'}><LogOutIcon /></button></div>
      </aside>

      <main className="studentDashMain">
        <header className="studentDashTopbar">
          <div><span className={`livePill ${!previewMode && !live ? 'offline' : ''}`}><i />{previewMode ? 'PREVIEW' : live ? 'LIVE' : 'OFFLINE'}</span><strong>{todayLabel}</strong><small>{timeLabel}</small></div>
          {previewMode && onExitPreview && <button className="adminBackToPanel" type="button" onClick={onExitPreview}><LogOutIcon /><span>Admin panelga qaytish</span></button>}
          <div className="studentTopProfile"><span>{initials}</span><div><small>{previewMode ? 'ADMIN PREVIEW' : 'STUDENT'}</small><strong>{student.firstName} {student.lastName}</strong></div></div>
        </header>

        <section className="studentWelcome">
          <div><span className="studentWelcomeEyebrow"><SparklesIcon /> PERSONAL PERFORMANCE</span><h1>Xush kelibsiz, {student.firstName}! <em>Natijalaringiz o‘sib bormoqda.</em></h1><p>{previewMode ? 'Bu admin preview. Student tizimga kirganda aynan shu real-time dashboardni ko‘radi.' : 'Kunlik natijalar, band trendi va yutuqlaringiz Supabase’dagi haqiqiy test natijalari bilan avtomatik yangilanadi.'}</p></div>
          <img src={achievementAssets['study-hero']} alt="Ta’lim yutug‘i" className="studentWelcomeArt" />
        </section>

        <section className="studentMetricGrid">
          <article className="studentMetric"><div className="studentMetricIcon overall"><img src={achievementAssets['quote-trophy']} alt="" /></div><div><small>Overall Band</small><strong>{fmtBand(data.overallBand)}</strong><span>{bandLabel(data.overallBand)}</span></div></article>
          <article className="studentMetric"><div className="studentMetricIcon reading"><BookOpenIcon /></div><div><small>Reading</small><strong>{fmtBand(data.readingBand)}</strong><span>{bandLabel(data.readingBand)}</span></div></article>
          <article className="studentMetric"><div className="studentMetricIcon listening"><HeadphonesIcon /></div><div><small>Listening</small><strong>{fmtBand(data.listeningBand)}</strong><span>{bandLabel(data.listeningBand)}</span></div></article>
          <article className="studentMetric"><div className="studentMetricIcon hours"><ClockIcon /></div><div><small>Weekly Study Hours</small><strong>{data.weeklyStudyHours.toFixed(1)} <b>hrs</b></strong><span>Goal: {data.weeklyGoalHours} hrs</span><div className="studentMiniProgress"><i style={{ width: `${studyPct}%` }} /></div></div></article>
          <article className="studentMetric"><div className="studentMetricIcon tests"><img src={achievementAssets['ten-tests']} alt="" /></div><div><small>Tests Completed</small><strong>{data.testsCompleted}</strong><span>{data.studyStreak} kunlik streak</span></div></article>
        </section>

        <section className="studentDashboardGrid">
          <article className="studentPanel studentDailyPanel"><header><div><h2>Daily Results</h2><p>Oxirgi 14 kundagi band natijalari</p></div><span>14 DAYS</span></header><MiniLine points={data.dailyResults} /></article>
          <div className="studentMidStack">
            <article className="studentPanel compact"><header><div><h2>Band Trend</h2><p>Oxirgi 8 hafta</p></div><span>{previewMode ? 'PREVIEW' : 'LIVE'}</span></header><SmallTrend points={data.bandTrend} /></article>
            <article className="studentPanel compact studentDailyTasksCard">
              <header><div><h2>Daily Tasks</h2><p>Vazifalarni bajaring va PTS yig‘ing</p></div><span>DAILY</span></header>
              <div className="studentDailyTaskStats">
                <div className="pts"><span><ZapIcon /></span><small>YOUR PTS</small><strong>{totalPts}</strong><em>PTS</em></div>
                <div className="streak"><span><FlameIcon /></span><small>STREAK</small><strong>{data.studyStreak}</strong><em>kun</em></div>
              </div>
              <Link className="studentDailyTasksCta" href="/daily-tasks">Daily Tasks’ga o‘tish <span>→</span></Link>
            </article>
          </div>
          <aside className="studentRightStack">
            <article className="studentProgressSummary"><div className="summaryTop"><div><small>YOUR PROGRESS</small><h2>{bandLabel(data.overallBand)}</h2></div><img src={achievementAssets['target']} alt="" /></div><p>Natijalar jonli tarzda kuzatilmoqda. Keyingi maqsadga muntazamlik bilan yetasiz.</p><div className="summaryStats"><div><small>Next Target</small><strong>{fmtBand(data.nextTargetBand)}</strong><span>{nextGap === null ? '—' : `${nextGap.toFixed(1)} band qoldi`}</span></div><div><small>Focus Area</small><strong>{data.focusArea}</strong><span>Eng ko‘p e’tibor kerak</span></div></div><Link href={data.focusArea === 'Listening' ? '/ielts/listening' : '/ielts/reading'}>Practice’ga o‘tish <span>→</span></Link></article>
            <article className="studentPanel recentPanel"><header><div><h2>Recent Results</h2><p>So‘nggi testlar</p></div></header><div className="recentList">{recent.length ? recent.map((item) => <div className="recentRow" key={item.id}><div><strong>{item.title}</strong><span>{item.skill} · {new Intl.DateTimeFormat('uz-UZ',{day:'2-digit',month:'short'}).format(new Date(item.date))}</span></div><b>{item.band === null ? item.score : item.band.toFixed(1)}</b></div>) : <div className="dashNoData dashNoDataSmall">Hali natija yo‘q</div>}</div></article>
          </aside>
        </section>

        <section className="studentAchievements studentPanel"><header><div><h2>Achievements</h2><p>Har bir yutuq haqiqiy faoliyatga qarab ochiladi.</p></div><span>{data.unlockedAchievements} / {data.achievements.length} UNLOCKED</span></header><div className="achievementGrid">{data.achievements.map((achievement) => <article key={achievement.id} className={`${achievement.unlocked ? 'unlocked' : 'locked'} achievement-${achievement.id}`}><span className="achievementIconBox" aria-hidden="true"><AchievementGlyph id={achievement.id} /></span><div><strong>{achievement.title}</strong><p>{achievement.description}</p><div className="achievementProgress"><i style={{ width: `${achievement.progress}%` }} /></div><span>{achievement.unlocked ? '✓ Unlocked' : `${Math.round(achievement.progress)}%`}</span></div></article>)}</div></section>
      </main>
    </div>
  );
}