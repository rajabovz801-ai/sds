'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';

type Student = { firstName: string; lastName: string };

const items = [
  { href: '/mock', label: 'Mock', soon: false },
  { href: '/practice', label: 'Practice', soon: true },
  { href: '/study-tools', label: 'Study tools', soon: true },
  { href: '/ai-tutor', label: 'AI Tutor', soon: true },
  { href: '/live-chat', label: 'Live Chat', soon: true },
  { href: '/billing', label: 'Billing', soon: true },
];

export function PlatformNav() {
  const pathname = usePathname();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));
  }, [pathname]);

  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="platformBarWrap">
      <header className="platformBar">
        <Link href="/" className="platformBrand" aria-label="ARK Mock bosh sahifa">
          <span className="platformBrandMark"><ArkLogoIcon /></span>
          <span className="platformBrandText"><strong>ARK MOCK</strong><small>IELTS • CEFR</small></span>
        </Link>

        <nav className="platformNav" aria-label="Platforma">
          {items.map((item) => {
            const active = pathname === item.href || (item.href === '/mock' && pathname.startsWith('/mock/'));
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                {item.label}
                {item.soon && <span className="soonDot">SOON</span>}
              </Link>
            );
          })}
        </nav>

        <div className="platformActions">
          {isAdmin && <span className="adminModeChip"><b>ADM</b><span>Admin mode</span></span>}
          <Link className="profileChip" href="/login">
            <span className="profileAvatar">{student?.firstName?.charAt(0).toUpperCase() || 'U'}</span>
            <span className="profileLabel">{student ? `${student.firstName} ${student.lastName}` : 'Kirish'}</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
