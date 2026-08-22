import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="arkBrand" aria-label="ARK bosh sahifa">
      <span className="arkBrandMark" aria-hidden="true"><span>A</span></span>
      <span className="arkBrandText">
        <strong>ARK</strong>
        <small>EXAM HUB</small>
      </span>
    </Link>
  );
}
