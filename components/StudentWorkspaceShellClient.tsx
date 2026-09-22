'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  LayoutGridIcon,
  ChecklistIcon,
  TargetIcon,
  LogOutIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';

type WorkspaceTrack = 'dashboard' | 'tests' | 'progress' | 'profile' | 'ielts' | 'cefr' | 'practice' | 'tools' | 'daily-tasks' | 'leaderboard';

type Props = {
  student: StudentSummary;
  active: WorkspaceTrack;
  children: ReactNode;
};

export function StudentWorkspaceShellClient({ student, active, children }: Props) {
  const router = useRouter();

  async function logout() {
    await Promise.allSettled([
      supabase.auth.signOut({ scope: 'local' }),
      fetch('/api/auth/logout', { method: 'POST' }),
    ]);
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="studentDashboardShell studentWorkspaceShell studentRedShell">
      <aside className="studentSidebar studentRedSidebar">
        <Link href="/mock" className="studentBrand studentRedBrand">
          <span className="studentBrandMark"><ArkLogoIcon /></span>
          <span><strong>ARK Education</strong><small>IELTS TEST PLATFORM</small></span>
        </Link>

        <nav className="studentSideNav studentRedNav" aria-label="Student workspace navigation">
          <Link className={active === 'dashboard' ? 'active' : ''} href="/mock"><LayoutGridIcon /><span>Dashboard</span></Link>
          <Link className={active === 'tests' || active === 'ielts' ? 'active' : ''} href="/ielts"><ChecklistIcon /><span>Tests</span></Link>
          <Link className={active === 'progress' ? 'active' : ''} href="/progress"><TargetIcon /><span>Progress</span></Link>
        </nav>

        <div className="studentRedProfile">
          <button className="studentRedProfileLink" type="button" onClick={logout} aria-label="Log out">
            <span className="studentRedProfileAvatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
            <span><small>STUDENT</small><strong>{student.firstName} {student.lastName}</strong></span>
            <LogOutIcon />
          </button>
        </div>
      </aside>

      <main className="studentWorkspaceMain studentRedMain">{children}</main>
    </div>
  );
}
