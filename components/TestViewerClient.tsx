'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ClockIcon, ShieldCheckIcon } from '@/components/UiIcons';

type ViewerData = {
  test: {
    id: string;
    title: string;
    track: string;
    skill: string;
    fileName: string;
    durationMinutes: number;
  };
  contentUrl: string;
};

type Props = {
  id: string;
  initialData: ViewerData;
  attemptId?: string;
  mode?: string;
  section?: string;
};

type ExamSession = {
  sessionId: string;
  startedAt: string;
  expiresAt: string;
  lockedUntil: string | null;
  durationSeconds: number;
  resumed: boolean;
};

function normalizeMessage(value: unknown) {
  let data = value as any;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  const type = String(data.type || '').toUpperCase();
  const accepted = ['ARK_TEST_RESULT', 'ARK:TEST-RESULT', 'ARK_RESULT', 'TEST_RESULT'];
  if (!accepted.includes(type) && !data.arkResult) return null;
  return data.payload || data.result || data.arkResult || data;
}

export function TestViewerClient({ id, initialData: data, attemptId, mode, section }: Props) {
  const router = useRouter();
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savingRef = useRef(false);
  const lastPayloadRef = useRef('');
  const examActiveRef = useRef(false);
  const lockRef = useRef(false);

  const [launchState, setLaunchState] = useState<'idle' | 'starting' | 'ready' | 'blocked'>('idle');
  const [launchError, setLaunchError] = useState('');
  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [bridgeError, setBridgeError] = useState('');
  const [lock, setLock] = useState({ active: false, seconds: 0 });

  const isMock = mode === 'mock' && Boolean(attemptId && section);
  const backHref = isMock && attemptId ? `/mock/${attemptId}` : '/dashboard';

  const iframeSrc = useMemo(() => {
    if (!examSession) return '';
    const params = new URLSearchParams({ session: examSession.sessionId });
    if (mode) params.set('mode', mode);
    if (attemptId) params.set('attempt', attemptId);
    if (section) params.set('section', section);
    return `${data.contentUrl}?${params.toString()}`;
  }, [attemptId, data.contentUrl, examSession, mode, section]);

  const requestFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return true;
    if (!viewerRef.current?.requestFullscreen) return false;
    try {
      await viewerRef.current.requestFullscreen({ navigationUI: 'hide' });
      return Boolean(document.fullscreenElement);
    } catch {
      return false;
    }
  }, []);

  const startExam = async () => {
    if (launchState === 'starting') return;
    setLaunchState('starting');
    setLaunchError('');

    const fullscreen = await requestFullscreen();
    if (!fullscreen) {
      setLaunchState('idle');
      setLaunchError('Testni boshlash uchun browser fullscreen ruxsatini bering.');
      return;
    }

    try {
      const response = await fetch(`/api/tests/${id}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: isMock ? 'mock' : 'practice', attemptId, section }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Test boshlanmadi.');
      setExamSession(body as ExamSession);
      setLaunchState('ready');
      examActiveRef.current = true;
      const lockedUntil = body.lockedUntil ? Date.parse(body.lockedUntil) : 0;
      if (lockedUntil > Date.now()) {
        lockRef.current = true;
        setLock({ active: true, seconds: Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000)) });
      }
    } catch (error) {
      examActiveRef.current = false;
      setLaunchState('blocked');
      setLaunchError(error instanceof Error ? error.message : 'Test boshlanmadi.');
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!examSession) return;

    const saveResult = async (payload: any) => {
      if (savingRef.current) return;
      let fingerprint = '';
      try { fingerprint = JSON.stringify(payload); } catch { fingerprint = String(Date.now()); }
      if (fingerprint && fingerprint === lastPayloadRef.current) return;

      savingRef.current = true;
      lastPayloadRef.current = fingerprint;
      setBridgeError('');

      try {
        const endpoint = isMock && attemptId
          ? `/api/mock/attempts/${attemptId}/result`
          : `/api/tests/${id}/submit`;
        const requestBody = isMock
          ? { ...payload, result: payload, section, testId: id, testSessionId: examSession.sessionId }
          : { ...payload, result: payload, testId: id, testSessionId: examSession.sessionId };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Natija saqlanmadi.');
        examActiveRef.current = false;
        iframeRef.current?.contentWindow?.postMessage({ type: 'ARK_RESULT_SAVED', payload: body }, '*');
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
        if (isMock && attemptId && section) {
          window.setTimeout(() => {
            router.replace(`/mock/${attemptId}?saved=${encodeURIComponent(section)}`);
            router.refresh();
          }, 450);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Natija saqlanmadi.';
        setBridgeError(message);
        iframeRef.current?.contentWindow?.postMessage({ type: 'ARK_RESULT_ERROR', error: message }, '*');
        lastPayloadRef.current = '';
      } finally {
        savingRef.current = false;
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) return;
      const message = event.data as any;
      if (message?.type === 'ARK_TEST_READY') {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ARK_PLATFORM_START',
          expiresAt: examSession.expiresAt,
        }, '*');
        return;
      }
      const payload = normalizeMessage(event.data);
      if (payload) void saveResult(payload);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, examSession, id, isMock, router, section]);

  const recordViolation = useCallback(() => {
    if (!examSession) return;
    void fetch(`/api/tests/sessions/${examSession.sessionId}/violation`, { method: 'POST' });
  }, [examSession]);

  const triggerLock = useCallback(() => {
    if (!examActiveRef.current || lockRef.current) return;
    lockRef.current = true;
    setLock({ active: true, seconds: 10 });
    recordViolation();
    iframeRef.current?.contentWindow?.postMessage({ type: 'ARK_SECURITY_LOCK', seconds: 10 }, '*');
  }, [recordViolation]);

  useEffect(() => {
    if (launchState !== 'ready') return;
    const onFullscreen = () => {
      if (!document.fullscreenElement) triggerLock();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') triggerLock();
    };
    const onBlur = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) triggerLock();
      }, 120);
    };

    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [launchState, triggerLock]);

  useEffect(() => {
    if (!lock.active || lock.seconds <= 0) return;
    const timer = window.setTimeout(() => {
      setLock((value) => ({ ...value, seconds: Math.max(0, value.seconds - 1) }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [lock]);

  const resumeExam = async () => {
    if (lock.seconds > 0) return;
    const fullscreen = await requestFullscreen();
    if (!fullscreen) return;
    lockRef.current = false;
    setLock({ active: false, seconds: 0 });
    iframeRef.current?.contentWindow?.postMessage({ type: 'ARK_SECURITY_RESUME' }, '*');
  };

  return (
    <div className="viewerRoot" ref={viewerRef}>
      {launchState === 'ready' && (
        <div className="viewerBar">
          <Link href={backHref} className="viewerBack"><ArrowLeftIcon /> Orqaga</Link>
          <div className="viewerTitle"><b>{data.test.title}</b><span>{data.test.track.toUpperCase()} • {data.test.skill} • {data.test.fileName}</span></div>
        </div>
      )}

      {bridgeError && <div className="viewerBridgeError">{bridgeError}</div>}

      {launchState !== 'ready' ? (
        <main className="examPreflight">
          <section className="examPreflightCard">
            <span className="examPreflightIcon"><ShieldCheckIcon /></span>
            <small>ARK SECURE EXAM</small>
            <h1>{data.test.title}</h1>
            <p>Test faqat bir marta ishlanadi. Boshlagandan keyin vaqt to‘xtamaydi va sahifadan chiqish 10 soniyalik blokni yoqadi.</p>
            <div className="examPreflightFacts">
              <div><ClockIcon /><span><b>{data.test.durationMinutes} daqiqa</b><small>Server nazoratidagi vaqt</small></span></div>
              <div><ShieldCheckIcon /><span><b>Bir urinish</b><small>Takroran ochib bo‘lmaydi</small></span></div>
            </div>
            {launchError && <div className="examPreflightError">{launchError}</div>}
            {launchState === 'blocked' ? (
              <Link className="examPreflightBack" href={backHref}><ArrowLeftIcon /> Platformaga qaytish</Link>
            ) : (
              <button type="button" onClick={startExam} disabled={launchState === 'starting'}>
                {launchState === 'starting' ? 'Tayyorlanmoqda…' : 'Fullscreen’da boshlash'}
              </button>
            )}
          </section>
        </main>
      ) : (
        <iframe
          ref={iframeRef}
          className="viewerFrame"
          title={data.test.title}
          sandbox="allow-modals allow-scripts"
          allow="fullscreen"
          allowFullScreen
          src={iframeSrc}
        />
      )}

      {lock.active && (
        <div className="examSecurityLock" role="alertdialog" aria-modal="true">
          <div>
            <span><ShieldCheckIcon /></span>
            <small>XAVFSIZLIK BLOKI</small>
            <h2>Test oynasidan chiqildi</h2>
            <p>Imtihon vaqti davom etmoqda. Testga qaytishdan oldin xavfsizlik kutish vaqti tugashi kerak.</p>
            <strong>{lock.seconds}</strong>
            <button type="button" disabled={lock.seconds > 0} onClick={resumeExam}>Fullscreen va davom etish</button>
          </div>
        </div>
      )}
    </div>
  );
}
