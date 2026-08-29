'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import styles from './MockExamCompanion.module.css';

type Props = { attemptId?: string; mode?: string };

function sessionIdFromFrame(frame: HTMLIFrameElement | null) {
  if (!frame) return '';
  try {
    const url = new URL(frame.src, window.location.href);
    return url.searchParams.get('session') || '';
  } catch {
    return '';
  }
}

export function MockExamCompanion({ attemptId, mode }: Props) {
  const enabled = mode === 'mock' && Boolean(attemptId);
  const [candidateId, setCandidateId] = useState('');
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const lastSavedRef = useRef('');
  const restoringRef = useRef('');

  useEffect(() => {
    if (!enabled || !attemptId) return;
    let active = true;
    void fetch(`/api/mock/attempts/${attemptId}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => { if (active) setCandidateId(String(body?.candidate?.id || '')); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [attemptId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let created: HTMLElement | null = null;
    const find = () => {
      if (stopped || created) return;
      const bar = document.querySelector<HTMLElement>('.viewerBar');
      if (!bar) return;
      created = document.createElement('div');
      bar.appendChild(created);
      setHost(created);
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => {
      stopped = true;
      observer.disconnect();
      created?.remove();
      setHost(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    async function restore(frame: HTMLIFrameElement) {
      const sessionId = sessionIdFromFrame(frame);
      if (!sessionId || restoringRef.current === sessionId) return;
      restoringRef.current = sessionId;
      try {
        const response = await fetch(`/api/tests/sessions/${sessionId}/draft`, { cache: 'no-store' });
        if (!response.ok) return;
        const body = await response.json();
        frame.contentWindow?.postMessage({ type: 'ARK_DRAFT_RESTORE', state: body?.state || {} }, '*');
      } catch {
        restoringRef.current = '';
      }
    }

    async function persist(sessionId: string, state: Record<string, unknown>) {
      let fingerprint = '';
      try { fingerprint = JSON.stringify(state); } catch { return; }
      if (!fingerprint || fingerprint === lastSavedRef.current) return;
      try {
        const response = await fetch(`/api/tests/sessions/${sessionId}/draft`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ state }),
        });
        if (response.ok) {
          lastSavedRef.current = fingerprint;
          setSaved(true);
          window.setTimeout(() => setSaved(false), 1100);
        }
      } catch {}
    }

    function scheduleSave(frame: HTMLIFrameElement, state: Record<string, unknown>) {
      pendingRef.current = state;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        const next = pendingRef.current;
        pendingRef.current = null;
        const sessionId = sessionIdFromFrame(frame);
        if (next && sessionId) void persist(sessionId, next);
      }, 500);
    }

    const onMessage = (event: MessageEvent) => {
      const frame = document.querySelector<HTMLIFrameElement>('.viewerFrame');
      if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
      const message = event.data as any;
      if (message?.type === 'ARK_TEST_READY') {
        window.setTimeout(() => void restore(frame), 30);
        return;
      }
      if (message?.type === 'ARK_DRAFT_STATE' && message.state && typeof message.state === 'object') {
        scheduleSave(frame, message.state as Record<string, unknown>);
      }
    };

    const frameObserver = new MutationObserver(() => {
      const frame = document.querySelector<HTMLIFrameElement>('.viewerFrame');
      if (!frame) return;
      frame.addEventListener('load', () => window.setTimeout(() => void restore(frame), 120), { once: true });
      if (frame.src) window.setTimeout(() => void restore(frame), 160);
    });
    frameObserver.observe(document.body, { subtree: true, childList: true });
    const existing = document.querySelector<HTMLIFrameElement>('.viewerFrame');
    if (existing) window.setTimeout(() => void restore(existing), 120);

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      frameObserver.disconnect();
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [enabled]);

  if (!enabled || !host) return null;
  return createPortal(
    <div className={styles.identity}>
      <small>CANDIDATE ID</small>
      <strong>{candidateId || 'Mock Candidate'}</strong>
      {saved && <span className={styles.saved}>Autosaved ✓</span>}
    </div>,
    host,
  );
}
