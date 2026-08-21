import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="siteHeader">
      <div className="shell headerInner">
        <Brand />
        <nav className="topNav" aria-label="Platform navigation">
          <a href="#platform">Platforma</a>
          <a href="#mock">Mock</a>
          <a href="#tracks">Yo‘nalishlar</a>
          <a href="#features">Imkoniyatlar</a>
          <a href="#how">Jarayon</a>
        </nav>
        <div className="headerActions">
          <Link className="dashboardBtn" href="/dashboard">Dashboard</Link>
          <Link className="signupBtn" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">
            <span className="ctaLabel">Telegram orqali kirish</span><span>↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
