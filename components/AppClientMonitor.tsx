'use client';

import { useEffect } from 'react';

type Report = {
  level?: 'error' | 'warning';
  source: string;
  message: string;
  stack?: string;
};

export function AppClientMonitor() {
  useEffect(() => {
    const sent = new Map<string, number>();

    const report = (input: Report) => {
      const message = String(input.message || '').trim();
      if (!message) return;

      const signature = `${input.source}:${message.slice(0, 220)}`;
      const now = Date.now();
      const previous = sent.get(signature) || 0;
      if (now - previous < 60_000) return;
      sent.set(signature, now);

      const body = JSON.stringify({
        level: input.level || 'error',
        source: input.source,
        message,
        stack: String(input.stack || '').slice(0, 1800),
        path: `${window.location.pathname}${window.location.search}`.slice(0, 220),
      });

      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          if (navigator.sendBeacon('/api/client-errors', blob)) return;
        }
      } catch {
        // Fall through to keepalive fetch.
      }

      void fetch('/api/client-errors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => undefined);
    };

    const onError = (event: ErrorEvent) => {
      report({
        source: 'window.error',
        message: event.message || 'Unhandled browser error',
        stack: event.error instanceof Error ? event.error.stack : '',
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report({
        source: 'unhandledrejection',
        message: reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection'),
        stack: reason instanceof Error ? reason.stack : '',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  return null;
}
