'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  LogOutIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';

type WorkspaceTrack = 'ielts' | 'cefr' | 'practice' | 'tools' | 'daily-tasks' | 'leaderboard';

type Props = {
  student: StudentSummary;
  active: WorkspaceTrack;
  children: ReactNode;
};

export function StudentWorkspaceShellClient({ student, active, children }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [studyStreak, setStudyStreak] = useState(0);
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';
  const totalPts = 0;

  useEffect(() => {
    let cancelled = false;

    async function loadSidebarSummary() {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!response.ok) return;
        const dashboard = await response.json() as { studyStreak?: number };
        if (!cancelled && Number.isFinite(dashboard.studyStreak)) {
          setStudyStreak(Math.max(0, Number(dashboard.studyStreak)));
        }
      } catch {
        // Keep the workspace usable even if the small sidebar summary cannot refresh.
      }
    }

    loadSidebarSummary();
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
      router.refresh();
    }
  }

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
          <Link className={active === 'practice' ? 'active' : ''} href="/practice"><BookOpenIcon /><span>Practice</span><small>SOON</small></Link>
          <Link className={active === 'tools' ? 'active' : ''} href="/study-tools"><SparklesIcon /><span>Tools</span><small>SOON</small></Link>
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

        <div className="studentSideProfile">
          <span>{initials}</span>
          <div><small>STUDENT</small><strong>{student.firstName} {student.lastName}</strong></div>
          <button type="button" onClick={logout} disabled={loggingOut} aria-label="Chiqish"><LogOutIcon /></button>
        </div>
      </aside>

      <main className="studentWorkspaceMain">{children}</main>
    </div>
  );
}