'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';

export function ArkSplashClient() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace('/login'), 850);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="arkEntrySplash" aria-label="ARK IELTS">
      <span className="arkEntryMark"><ArkLogoIcon /></span>
    </main>
  );
}
