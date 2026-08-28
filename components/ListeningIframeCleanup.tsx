'use client';

import { useEffect } from 'react';

type Props = {
  enabled: boolean;
};

const STYLE_ID = 'ark-platform-listening-cleanup';
const CLEANUP_CSS = `
#studentModal,
.premium-start-modal,
#exam-start-overlay,
.exam-start-overlay,
#securityLock,
.security-lock,
#fullscreen-guard,
.fullscreen-guard {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.warning-count { display: none !important; }
`;

export function ListeningIframeCleanup({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    const attached = new WeakSet<HTMLIFrameElement>();
    const cleanupFns: Array<() => void> = [];

    const inject = (iframe: HTMLIFrameElement) => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return false;
        if (doc.getElementById(STYLE_ID)) return true;
        const style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CLEANUP_CSS;
        (doc.head || doc.documentElement).appendChild(style);
        return true;
      } catch {
        return false;
      }
    };

    const reveal = (iframe: HTMLIFrameElement) => {
      iframe.style.opacity = '1';
      iframe.style.visibility = 'visible';
    };

    const attach = (iframe: HTMLIFrameElement) => {
      if (attached.has(iframe)) return;
      attached.add(iframe);

      // Keep the iframe hidden while its HTML is loading so its own start gate
      // never flashes between the platform Start click and the real test UI.
      iframe.style.opacity = '0';
      iframe.style.visibility = 'hidden';

      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        if (inject(iframe) || tries >= 80) {
          window.clearInterval(poll);
          if (tries >= 80) reveal(iframe);
        }
      }, 25);

      const onLoad = () => {
        inject(iframe);
        // Re-apply once after legacy scripts initialize, then reveal the test.
        window.setTimeout(() => {
          inject(iframe);
          reveal(iframe);
        }, 0);
      };

      iframe.addEventListener('load', onLoad);
      cleanupFns.push(() => {
        window.clearInterval(poll);
        iframe.removeEventListener('load', onLoad);
      });
    };

    document.querySelectorAll<HTMLIFrameElement>('iframe').forEach(attach);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node instanceof HTMLIFrameElement) attach(node);
          node.querySelectorAll?.('iframe').forEach((el) => {
            if (el instanceof HTMLIFrameElement) attach(el);
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupFns.forEach((fn) => fn());
    };
  }, [enabled]);

  return null;
}
