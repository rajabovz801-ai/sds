import Link from 'next/link';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';

export function Brand() {
  return (
    <Link href="/" className="arkBrand" aria-label="ARK bosh sahifa">
      <span className="arkBrandMark" aria-hidden="true">
        <ArkLogoIcon />
      </span>
      <span className="arkBrandText">
        <strong>ARK Education</strong>
        <small>EXAM PLATFORM</small>
      </span>
    </Link>
  );
}
