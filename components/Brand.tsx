import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ARK Mock bosh sahifa">
      <span className="brandMark" aria-hidden="true">A</span>
      <span className="brandText">
        <strong>ARK MOCK</strong>
        <small>EXAM PLATFORM</small>
      </span>
    </Link>
  );
}
