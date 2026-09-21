'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  BookOpenIcon,
  FlameIcon,
  LayoutGridIcon,
  ChecklistIcon,
  TargetIcon,
  ZapIcon,
  UserIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import type { DashboardData } from '@/lib/dashboard';

function fmtBand(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

function bandLabel(value: number | null) {
  if (value === null) return 'No result yet';
  if (value >= 8) return 'Excellent';
  if (value >= 7) return 'Good progress';
  if (value >= 6) return 'Developing well';
  return 'Keep building';
}

type StudentDashboardClientProps = {
  student: StudentSummary;
  initialData: DashboardData;
  previewMode?: boolean;
  onExitPreview?: () => void;
};

export function StudentDashboardClient({ student, initialData, previewMode = false }: StudentDashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [totalPts, setTotalPts] = useState(0);

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      try {
        const [dashRes, gameRes] = await Promise.all([
          fetch('/api/dashboard', { cache: 'no-store' }),
          fetch('/api/gamification', { cache: 'no-store' }),
        ]);
        if (dashRes.ok) {
          const next = await dashRes.json() as DashboardData;
          if (!cancelled) setData(next);
        }
        if (gameRes.ok) {
          const summary = await gameRes.json() as { totalPts?: number };
          if (!cancelled && Number.isFinite(summary.totalPts)) setTotalPts(Math.max(0, Number(summary.totalPts)));
        }
      } catch {
        // Keep the latest visible state if a refresh fails.
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 60000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [previewMode]);

  const recent = useMemo(() => data.recentResults.slice(0, 4), [data.recentResults]);

  return (
    <div className="studentDashboardShell studentRedShell">
      <aside className="studentSidebar studentRedSidebar">
        <Link href="/mock" className="studentBrand studentRedBrand">
          <span className="studentBrandMark"><ArkLogoIcon /></span>
          <span><strong>ARK Education</strong><small>IELTS WORKSPACE</small></span>
        </Link>

        <nav className="studentSideNav studentRedNav" aria-label="Student workspace navigation">
          <Link className="active" href="/mock"><LayoutGridIcon /><span>Home</span></Link>
          <Link href="/ielts"><ChecklistIcon /><span>Tests</span></Link>
          <Link href="/progress"><TargetIcon /><span>Progress</span></Link>
        </nav>

        <div className="studentRedProfile">
          <Link className="studentRedProfileLink" href="/profile">
            <span className="studentRedProfileAvatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
            <span><small>ACCOUNT</small><strong>{student.firstName} {student.lastName}</strong></span>
            <UserIcon />
          </Link>
        </div>
      </aside>

      <main className="studentDashMain studentRedMain routeDashboard">
        <header className="routeDashboardHeader">
          <div>
            <span className="routeRedEyebrow">TODAY ROUTE</span>
            <h1>{student.firstName}, here is today’s route.</h1>
            <p>Target Band {fmtBand(data.nextTargetBand)} · Keep your preparation focused and consistent.</p>
          </div>
          <div className="routeHeaderStats">
            <span><ZapIcon /><small>PTS</small><strong>{totalPts}</strong></span>
            <span><FlameIcon /><small>STREAK</small><strong>{data.studyStreak}</strong></span>
          </div>
        </header>

        <section className="routeMetricRow">
          <article className="routeMetricCard routeMetricPrimary">
            <span>OVERALL BAND</span>
            <strong>{fmtBand(data.overallBand)}</strong>
            <p>{bandLabel(data.overallBand)}</p>
            <div><small>Reading</small><b>{fmtBand(data.readingBand)}</b></div>
            <div><small>Listening</small><b>{fmtBand(data.listeningBand)}</b></div>
          </article>

          <article className="routeMetricCard">
            <span>TESTS COMPLETED</span>
            <strong>{data.testsCompleted}</strong>
            <p>Completed practice tests</p>
            <div className="routeMiniLine"><i style={{ width: `${Math.min(100, data.testsCompleted * 8)}%` }} /></div>
          </article>

          <article className="routeMetricCard routeStreakMetric">
            <span>DAY STREAK</span>
            <div className="routeFlameNumber"><FlameIcon /><strong>{data.studyStreak}</strong></div>
            <p>Consistency builds results.</p>
          </article>
        </section>

        <section className="routeContinue">
          <header>
            <div><span className="routeRedEyebrow">TODAY ROUTE</span><h2>Continue your prep</h2></div>
          </header>
          <Link href="/ielts" className="routePrepRow">
            <span className="routePrepIndex">01</span>
            <span className="routePrepIcon"><ChecklistIcon /></span>
            <span><strong>Tests</strong><small>Open your IELTS test library</small></span>
            <b>→</b>
          </Link>
          <Link href="/progress" className="routePrepRow">
            <span className="routePrepIndex">02</span>
            <span className="routePrepIcon"><TargetIcon /></span>
            <span><strong>Progress</strong><small>Track your scores and improvement</small></span>
            <b>→</b>
          </Link>
        </section>

        <section className="routeRecent">
          <header><div><span className="routeRedEyebrow">RECENT ACTIVITY</span><h2>Recent results</h2></div></header>
          {recent.length ? (
            <div className="routeRecentList">
              {recent.map((item) => (
                <article key={item.id}>
                  <span className="routeRecentIcon"><BookOpenIcon /></span>
                  <div><strong>{item.title}</strong><small>{item.skill}</small></div>
                  <b>{item.band === null ? item.score : item.band.toFixed(1)}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="routeEmptyState">No results yet. Complete your first test to start tracking progress.</div>
          )}
        </section>
      </main>
    </div>
  );
}
