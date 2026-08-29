'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRightIcon, FileTextIcon, RepeatIcon } from '@/components/UiIcons';

export function CefrSpeakingMockCard({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/cefr/speaking/mock-1/status?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const body = await response.json() as { enabled?: boolean };
      setEnabled(Boolean(body.enabled));
    } catch {}
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(refreshStatus, 5000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  if (!enabled) return null;

  return (
    <article className="testLibraryCard sidebarTestCard">
      <div className="testLibraryTop">
        <span><FileTextIcon /></span>
        <small>TEST 01</small>
      </div>
      <div className="testLibraryCopy">
        <span>CEFR · SPEAKING</span>
        <h3>Speaking Mock Test 1</h3>
      </div>
      <div className="sidebarAttemptMeta">
        <RepeatIcon />
        <span><strong>1</strong> attempt</span>
      </div>
      <Link href="/cefr/speaking/mock-1" className="sidebarTestOpen" prefetch>
        <strong>Boshlash</strong><ArrowRightIcon />
      </Link>
    </article>
  );
}
