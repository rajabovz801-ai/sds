import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="arkHeader">
      <div className="landingShell arkHeaderInner">
        <Brand />
        <nav className="arkTopNav" aria-label="Platform navigation">
          <a href="#platform">Platform</a>
          <a href="#features">Features</a>
          <a href="#tracks">IELTS & CEFR</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="arkHeaderActions">
          <Link className="arkLoginButton" href="/login">Kirish</Link>
          <Link className="arkHeaderCta" href="/dashboard">Dashboard <span>→</span></Link>
        </div>
      </div>
    </header>
  );
}
