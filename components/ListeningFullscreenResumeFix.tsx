'use client';

import { useEffect } from 'react';

type Props = {
  enabled: boolean;
};

type LegacyFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

function isFullscreen() {
  const legacyDocument = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(document.fullscreenElement || legacyDocument.webkitFullscreenElement);
}

function requestCompatibleFullscreen(root: LegacyFullscreenElement) {
  if (isFullscreen()) return;

  if (root.requestFullscreen) {
    try {
      const request = root.requestFullscreen();
      request?.catch(() => {
        try { root.webkitRequestFullscreen?.(); } catch {}
      });
      return;
    } catch {
      // Fall through to the older WebKit API below.
    }
  }

  try { root.webkitRequestFullscreen?.(); } catch {}
}

export function ListeningFullscreenResumeFix({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      if (isFullscreen()) return;
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('.examSecurityLock button');
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;

      const root = document.querySelector<LegacyFullscreenElement>('.viewerRoot');
      if (!root) return;
      requestCompatibleFullscreen(root);
    };

    const onFullscreenChange = () => {
      if (!isFullscreen()) return;
      const button = document.querySelector<HTMLButtonElement>('.examSecurityLock button:not(:disabled)');
      if (!button) return;

      // Some browsers finish the fullscreen transition after the original click.
      // Re-run the existing React resume handler once fullscreen is confirmed.
      window.setTimeout(() => button.click(), 0);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    };
  }, [enabled]);

  return null;
}
