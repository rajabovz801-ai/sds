import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="arkBrand" aria-label="ARK bosh sahifa">
      <span className="arkBrandMark" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path d="M13.5 35.5 24 10l10.5 25.5" />
          <path d="M17 28.5h14" />
          <path d="M10 36.5h28" />
        </svg>
      </span>
      <span className="arkBrandText">
        <strong>ARK Education</strong>
        <small>EXAM PLATFORM</small>
      </span>
    </Link>
  );
}
