import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ARK Mock Platform">
      <span className="brandMark">A</span>
      <span>
        <strong>ARK MOCK</strong>
        <small>IELTS • CEFR</small>
      </span>
    </Link>
  );
}
