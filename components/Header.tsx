import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="siteHeader">
      <div className="shell headerInner">
        <Brand />
        <nav className="topNav" aria-label="Platform navigation">
          <Link href="/">Bosh sahifa</Link>
          <Link href="/ielts">IELTS</Link>
          <Link href="/cefr">CEFR</Link>
        </nav>
      </div>
    </header>
  );
}
