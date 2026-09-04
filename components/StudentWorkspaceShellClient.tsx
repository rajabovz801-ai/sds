'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  AwardIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  FlameIcon,
  GlobeIcon,
  LayersIcon,
  LayoutGridIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import { StudentProfileMenu } from '@/components/StudentProfileMenu';
import type { StudentSummary } from '@/lib/auth/server-session';

type WorkspaceTrack = 'ielts' | 'cefr' | 'practice' | 'tools' | 'daily-tasks' | 'leaderboard';

type Props = {
  student: StudentSummary;
  active: WorkspaceTrack;
  children: ReactNode;
};

type GamificationPayload = {
  totalPts?: number;
  streakDays?: number;
};

export function StudentWorkspaceShellClient({ student, active, children }: Props) {
  const [studyStreak, setStudyStreak] = useState(0);
  const [totalPts, setTotalPts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarSummary() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/gamification', { cache: 'no-store' });
        if (!response.ok) return;
        const summary = await response.json() as GamificationPayload;
        if (cancelled) return;
        if (Number.isFinite(summary.totalPts)) setTotalPts(Math.max(0, Number(summary.totalPts)));
        if (Number.isFinite(summary.streakDays)) setStudyStreak(Math.max(0, Number(summary.streakDays)));
      } catch {
        // Keep the workspace usable even if the compact summary cannot refresh.
      }
    }

    loadSidebarSummary();
    const interval = window.setInterval(loadSidebarSummary, 60000);
    const onFocus = () => loadSidebarSummary();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadSidebarSummary();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className="studentDashboardShell studentWorkspaceShell">
      <aside className="studentSidebar">
        <Link href="/mock" className="studentBrand">
          <span className="studentBrandMark"><ArkLogoIcon /></span>
          <span><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span>
        </Link>

        <nav className="studentSideNav" aria-label="Student workspace navigation">
          <Link href="/mock"><LayoutGridIcon /><span>Dashboard</span></Link>
          <Link className={active === 'ielts' ? 'active' : ''} href="/ielts"><GlobeIcon /><span>IELTS</span></Link>
          <Link className={active === 'cefr' ? 'active' : ''} href="/cefr"><LayersIcon /><span>CEFR</span></Link>
          <Link className={active === 'practice' ? 'active' : ''} href="/practice"><BookOpenIcon /><span>Practice</span></Link>
          <Link className={active === 'tools' ? 'active' : ''} href="/study-tools"><SparklesIcon /><span>Tools</span></Link>
          <Link className={active === 'daily-tasks' ? 'active' : ''} href="/daily-tasks"><CalendarCheckIcon /><span>Daily Tasks</span></Link>
          <Link className={active === 'leaderboard' ? 'active' : ''} href="/leaderboard"><AwardIcon /><span>Leaderboard</span></Link>
        </nav>

        <Link className="studentSideDailySummary" href="/daily-tasks">
          <span className="studentSideDailyIcon"><CalendarCheckIcon /></span>
          <div>
            <small>DAILY TASKS</small>
            <strong>{totalPts} PTS</strong>
            <em><FlameIcon /> {studyStreak} kun streak</em>
          </div>
          <b>→</b>
        </Link>

        <StudentProfileMenu student={student} totalPts={totalPts} streakDays={studyStreak} />
      </aside>

      <main className="studentWorkspaceMain">{children}</main>
    </div>
  );
}
