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

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value).replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function fraction(value: unknown) {
  if (value === null || value === undefined) return null;
  const match = String(value).replace(/,/g, '.').match(/(-?\d+(?:\.\d+)?)\s*(?:\/|\bof\b)\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  return Number.isFinite(current) && Number.isFinite(total) && total > 0 ? [current, total] as const : null;
}

function firstValue(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeResultPayload(input: any) {
  const source = input && typeof input === 'object' ? input : {};
  const nested = source.result && typeof source.result === 'object' ? source.result : {};
  const merged = { ...nested, ...source };
  const details = merged.details && typeof merged.details === 'object' && !Array.isArray(merged.details)
    ? merged.details
    : {};

  const scoreValue = firstValue(merged, ['rawScore', 'score', 'resultScore', 'finalScore', 'correct', 'correctCount']);
  const scorePair = fraction(scoreValue);
  let rawScore = scorePair ? scorePair[0] : finiteNumber(scoreValue);
  let maxScore = scorePair ? scorePair[1] : finiteNumber(firstValue(merged, [
    'maxScore', 'total', 'totalScore', 'questionTotal', 'totalQuestions', 'questionCount', 'max',
  ]));

  let correct = finiteNumber(firstValue(merged, ['correct', 'correctCount', 'correct_count']));
  let wrong = finiteNumber(firstValue(merged, ['wrong', 'wrongCount', 'incorrect', 'incorrectCount', 'wrong_count']));
  let unanswered = finiteNumber(firstValue(merged, ['unanswered', 'unansweredCount', 'empty', 'emptyCount', 'unanswered_count']));
  const answeredValue = firstValue(merged, ['answered', 'answeredCount', 'answeredQuestions']);
  const answeredPair = fraction(answeredValue);
  let answered = answeredPair ? answeredPair[0] : finiteNumber(answeredValue);
  if (maxScore === null && answeredPair) maxScore = answeredPair[1];

  if (rawScore === null && correct !== null) rawScore = correct;
  if (correct === null && rawScore !== null) correct = rawScore;
  if (answered === null && maxScore !== null && unanswered !== null) answered = Math.max(0, maxScore - unanswered);
  if (wrong === null && answered !== null && correct !== null) wrong = Math.max(0, answered - correct);
  if (unanswered === null && maxScore !== null && correct !== null && wrong !== null) {
    unanswered = Math.max(0, maxScore - correct - wrong);
  }

  const normalized: Record<string, any> = {
    ...merged,
    details,
  };
  if (rawScore !== null) normalized.rawScore = rawScore;
  if (maxScore !== null) normalized.maxScore = maxScore;
  if (correct !== null) normalized.correct = Math.max(0, Math.round(correct));
  if (wrong !== null) normalized.wrong = Math.max(0, Math.round(wrong));
  if (unanswered !== null) normalized.unanswered = Math.max(0, Math.round(unanswered));

  const band = finiteNumber(firstValue(merged, ['band', 'bandScore', 'overallBand']));
  if (band !== null) normalized.band = band;
  const durationSeconds = finiteNumber(firstValue(merged, ['durationSeconds', 'elapsedSeconds', 'timeSpentSeconds']));
  if (durationSeconds !== null) normalized.durationSeconds = Math.max(0, Math.round(durationSeconds));

  return normalized;
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
      const normalizedPayload = normalizeResultPayload(payload);
      let fingerprint = '';
      try { fingerprint = JSON.stringify(normalizedPayload); } catch { fingerprint = String(Date.now()); }
      if (fingerprint && fingerprint === lastPayloadRef.current) return;

      savingRef.current = true;
      lastPayloadRef.current = fingerprint;
      setBridgeError('');

      try {
        const endpoint = isMock && attemptId
          ? `/api/mock/attempts/${attemptId}/result`
          : `/api/tests/${id}/submit`;
        const requestBody = isMock
          ? { ...normalizedPayload, result: normalizedPayload, section, testId: id, testSessionId: examSession.sessionId }
          : { ...normalizedPayload, result: normalizedPayload, testId: id, testSessionId: examSession.sessionId };
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
        // Listening Test 2 uses an external MP3 and Chrome requires a real
        // user gesture inside the iframe before audible playback. Leave its
        // own Start Listening gate intact instead of synthetic auto-clicking.
        if (data.test.id !== 'c28b8a10-7af0-4ec3-8006-2a9ad46803c1') {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'ARK_PLATFORM_START',
            expiresAt: examSession.expiresAt,
          }, '*');
        }
        return;
      }
      const payload = normalizeMessage(event.data);
      if (payload) void saveResult(payload);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, data.test.id, examSession, id, isMock, router, section]);

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
            <p>{isMock
              ? 'Bu Full Mock bo‘limi bir urinish tartibida ishlaydi. Boshlagandan keyin vaqt to‘xtamaydi va sahifadan chiqish 10 soniyalik blokni yoqadi.'
              : 'Bu practice testni qayta-qayta ishlashingiz mumkin. Har safar yangi urinish va yangi natija saqlanadi; boshlangan testning vaqti esa to‘xtamaydi.'}</p>
            <div className="examPreflightFacts">
              <div><ClockIcon /><span><b>{data.test.durationMinutes} daqiqa</b><small>Server nazoratidagi vaqt</small></span></div>
              <div><ShieldCheckIcon /><span><b>{isMock ? 'Bir urinish' : 'Doim ochiq'}</b><small>{isMock ? 'Mock section takroran ochilmaydi' : 'Qayta ishlash mumkin'}</small></span></div>
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
          allow={data.test.skill === 'listening' ? 'autoplay; fullscreen' : 'fullscreen'}
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