'use client';

import { useEffect, useState } from 'react';

export function TestReliabilityGuard() {
  const [online, setOnline] = useState(true);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    let timer = 0;

    const handleOffline = () => {
      window.clearTimeout(timer);
      setRestored(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      setRestored(true);
      timer = window.setTimeout(() => setRestored(false), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (online && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(18px, env(safe-area-inset-bottom))',
        zIndex: 9999,
        transform: 'translateX(-50%)',
        width: 'min(560px, calc(100% - 28px))',
        padding: '11px 14px',
        borderRadius: 13,
        border: online ? '1px solid rgba(42,122,86,.18)' : '1px solid rgba(187,77,64,.2)',
        background: online ? '#edf8f2' : '#fff2ee',
        color: online ? '#216848' : '#9f4035',
        boxShadow: '0 12px 32px rgba(16,35,63,.12)',
        fontSize: 12,
        fontWeight: 750,
        lineHeight: 1.4,
        textAlign: 'center',
      }}
    >
      {online
        ? 'Internet qayta ulandi. Testni davom ettirishingiz mumkin.'
        : 'Internet uzildi. Sahifani yopmang — ulanish qaytgach testni davom ettiring.'}
    </div>
  );
}
