'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  LayoutGridIcon,
  ChecklistIcon,
  TargetIcon,
  UserIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';

type WorkspaceTrack = 'tests' | 'progress' | 'profile' | 'ielts' | 'cefr' | 'practice' | 'tools' | 'daily-tasks' | 'leaderboard';

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
        // Keep navigation available even when the compact summary cannot refresh.
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
    <div className="studentDashboardShell studentWorkspaceShell studentRedShell">
      <aside className="studentSidebar studentRedSidebar">
        <Link href="/mock" className="studentBrand studentRedBrand">
          <span className="studentBrandMark"><ArkLogoIcon /></span>
          <span><strong>ARK Education</strong><small>IELTS WORKSPACE</small></span>
        </Link>

        <nav className="studentSideNav studentRedNav" aria-label="Student workspace navigation">
          <Link href="/mock"><LayoutGridIcon /><span>Home</span></Link>
          <Link className={active === 'tests' ? 'active' : ''} href="/ielts"><ChecklistIcon /><span>Tests</span></Link>
          <Link className={active === 'progress' ? 'active' : ''} href="/progress"><TargetIcon /><span>Progress</span></Link>
        </nav>

        <div className="studentRedProfile">
          <Link className={`studentRedProfileLink ${active === 'profile' ? 'active' : ''}`} href="/profile">
            <span className="studentRedProfileAvatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
            <span><small>ACCOUNT</small><strong>{student.firstName} {student.lastName}</strong></span>
            <UserIcon />
          </Link>
        </div>
      </aside>

      <main className="studentWorkspaceMain studentRedMain">{children}</main>
    </div>
  );
}
