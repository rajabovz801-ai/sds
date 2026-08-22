'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { LogOutIcon } from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';

const items = [
  { href: '/mock', label: 'Boshqaruv' },
  { href: '/ielts', label: 'IELTS' },
  { href: '/cefr', label: 'CEFR' },
  { href: '/practice', label: 'Practice', soon: true },
  { href: '/study-tools', label: 'Tools', soon: true },
];

export function PlatformNav({ student }: { student: StudentSummary }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';

  return (
    <div className="platformBarWrap">
      <header className="platformBar">
        <Link href="/mock" className="platformBrand" aria-label="ARK Education platformasi">
          <span className="platformBrandMark"><ArkLogoIcon /></span>
          <span className="platformBrandText"><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span>
        </Link>

        <nav className="platformNav" aria-label="Platforma bo‘limlari">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''} prefetch>
                {item.label}
                {item.soon && <span className="soonDot">SOON</span>}
              </Link>
            );
          })}
        </nav>

        <div className="platformActions">
          <div className="profileChip" title={`${student.firstName} ${student.lastName}`}>
            <span className="profileAvatar">{initials}</span>
            <span className="profileLabel"><small>Student</small><strong>{student.firstName} {student.lastName}</strong></span>
          </div>
          <button className="platformLogout" type="button" onClick={logout} disabled={loggingOut} aria-label="Sessiyadan chiqish" title="Sessiyadan chiqish">
            <LogOutIcon />
          </button>
        </div>
      </header>
    </div>
  );
}
