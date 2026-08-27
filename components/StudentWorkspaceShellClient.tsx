'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  BookOpenIcon,
  GlobeIcon,
  LayersIcon,
  LayoutGridIcon,
  LogOutIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import { achievementAssets } from '@/components/achievementAssets';

type WorkspaceTrack = 'ielts' | 'cefr';

type Props = {
  student: StudentSummary;
  active: WorkspaceTrack;
  children: ReactNode;
};

export function StudentWorkspaceShellClient({ student, active, children }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';

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
          <Link href="/practice"><BookOpenIcon /><span>Practice</span><small>SOON</small></Link>
          <Link href="/study-tools"><SparklesIcon /><span>Tools</span><small>SOON</small></Link>
        </nav>

        <div className="studentSideMotivation">
          <img src={achievementAssets['fast-learner']} alt="" />
          <strong>Keep going!</strong>
          <p>Har bir yakunlangan test maqsadingizga yaqinlashtiradi.</p>
        </div>

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
