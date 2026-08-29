'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './CefrSpeakingMockCard.module.css';

export function CefrSpeakingMockCard({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/cefr/speaking/mock-1/status?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'x-ark-live-status': '1' },
      });
      if (!response.ok) return;
      const body = await response.json() as { enabled?: boolean };
      setEnabled(Boolean(body.enabled));
    } catch {
      // Keep the last known state if a quick refresh fails.
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(refreshStatus, 5000);
    const onFocus = () => void refreshStatus();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshStatus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshStatus]);

  if (!enabled) return null;

  return (
    <section className={styles.card}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>CEFR · SPEAKING MOCK</span>
        <h2>Speaking Mock Test 1</h2>
        <p>Part 1 va Part 1.2 · timed speaking · microphone recording · bitta to‘liq audio.</p>
        <div className={styles.facts}>
          <span>3 + 3 questions</span>
          <span>Prep timer</span>
          <span>Full recording</span>
        </div>
      </div>
      <Link className={styles.action} href="/cefr/speaking/mock-1">Start Speaking →</Link>
    </section>
  );
}
