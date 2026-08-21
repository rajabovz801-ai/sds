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
          <a href="#how">Qanday ishlaydi</a>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <Link className="signupBtn" href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Sign up <span>↗</span></Link>
      </div>
    </header>
  );
}
