'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGridIcon } from '@/components/UiIcons';

export function AdminMenuPreview() {
  const [topbarHost, setTopbarHost] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const attach = () => {
      const host = document.querySelector<HTMLElement>('.adminTopActions');
      if (host) setTopbarHost(host);
      return Boolean(host);
    };
    if (attach()) return;
    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function openStudentView() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/student-view', {
        method: 'POST',
        cache: 'no-store',
      });
      const body = await response.json() as { next?: string; error?: string };
      if (!response.ok) throw new Error(body.error || 'Asosiy menyu ochilmadi.');
      window.location.assign(body.next || '/mock');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Asosiy menyu ochilmadi.');
      setBusy(false);
    }
  }

  if (!topbarHost) return null;
  return createPortal(
    <button className="adminMainMenuButton" type="button" onClick={openStudentView} disabled={busy}>
      <LayoutGridIcon /><span>{busy ? 'Ochilyapti…' : 'Asosiy menyu'}</span>
    </button>,
    topbarHost,
  );
}
