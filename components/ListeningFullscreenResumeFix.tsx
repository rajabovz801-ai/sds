'use client';

import { useEffect } from 'react';

type Props = {
  enabled: boolean;
};

export function ListeningFullscreenResumeFix({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      if (document.fullscreenElement) return;
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('.examSecurityLock button');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;

      const root = document.querySelector<HTMLElement>('.viewerRoot');
      if (!root?.requestFullscreen) return;

      try {
        const request = root.requestFullscreen({ navigationUI: 'hide' });
        request?.catch(() => undefined);
      } catch {
        // Existing resume handler remains the fallback path.
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [enabled]);

  return null;
}
