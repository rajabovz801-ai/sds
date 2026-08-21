'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/practice', label: 'Practice' },
  { href: '/study-tools', label: 'Study tools' },
  { href: '/ai-tutor', label: 'AI Tutor' },
  { href: '/live-chat', label: 'Live Chat' },
  { href: '/billing', label: 'Billing' },
];

export function PlatformNav() {
  const pathname = usePathname();
  return (
    <div className="platformBarWrap">
      <header className="platformBar">
        <Link href="/" className="platformBrand" aria-label="ARK Mock bosh sahifa">
          <span className="platformBrandMark">A</span>
          <span className="platformBrandText"><strong>ARK MOCK</strong><small>IELTS • CEFR</small></span>
        </Link>
        <nav className="platformNav" aria-label="Platforma">
          {items.map((item) => {
            const active = pathname === item.href;
            const soon = item.href !== '/dashboard';
            return <Link key={item.href} href={item.href} className={active ? 'active' : ''}>{item.label}{soon && <span className="soonDot">SOON</span>}</Link>;
          })}
        </nav>
        <div className="platformActions">
          <Link className="adminShortcut" href="/admin"><b>⚙</b><span>Admin</span></Link>
          <div className="profileChip"><span className="profileAvatar">U</span><span className="profileLabel">Student</span></div>
        </div>
      </header>
    </div>
  );
}
