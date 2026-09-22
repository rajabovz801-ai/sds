'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenIcon,
  FlameIcon,
  ChecklistIcon,
  TargetIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
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

  useEffect(() => {
    if (previewMode) return;
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (response.ok) {
          const next = await response.json() as DashboardData;
          if (!cancelled) setData(next);
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
    <StudentWorkspaceShellClient student={student} active="dashboard">
      <div className="studentDashMain routeDashboard">
        <header className="routeDashboardHeader">
          <div>
            <span className="routeRedEyebrow">IELTS DASHBOARD</span>
            <h1>{student.firstName}, here is your progress.</h1>
            <p>Target Band {fmtBand(data.nextTargetBand)} · Reading and Listening practice overview.</p>
          </div>
          <div className="routeHeaderStats">
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
            <p>Completed IELTS tests</p>
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
            <div><span className="routeRedEyebrow">QUICK ACCESS</span><h2>Continue your prep</h2></div>
          </header>
          <Link href="/ielts" className="routePrepRow">
            <span className="routePrepIndex">01</span>
            <span className="routePrepIcon"><ChecklistIcon /></span>
            <span><strong>Tests</strong><small>Open Real Exam, Cambridge and Gold tests</small></span>
            <b>→</b>
          </Link>
          <Link href="/progress" className="routePrepRow">
            <span className="routePrepIndex">02</span>
            <span className="routePrepIcon"><TargetIcon /></span>
            <span><strong>Progress</strong><small>Track Reading and Listening results</small></span>
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
      </div>
    </StudentWorkspaceShellClient>
  );
}
