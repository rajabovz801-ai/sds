'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/UiIcons';

type ViewerData = {
  test: { id: string; title: string; track: string; skill: string; fileName: string };
  contentUrl: string;
};

type Props = {
  id: string;
  initialData: ViewerData;
  attemptId?: string;
  mode?: string;
  section?: string;
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
  const [bridgeState, setBridgeState] = useState<'idle' | 'ready' | 'saving' | 'saved' | 'error'>('idle');
  const [bridgeError, setBridgeError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savingRef = useRef(false);
  const lastPayloadRef = useRef('');

  const isMock = mode === 'mock' && Boolean(attemptId && section);
  const backHref = isMock && attemptId ? `/mock/${attemptId}` : '/dashboard';

  const iframeSrc = useMemo(() => {
    if (!data) return '';
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (attemptId) params.set('attempt', attemptId);
    if (section) params.set('section', section);
    const query = params.toString();
    return `${data.contentUrl}${query ? `?${query}` : ''}`;
  }, [data, mode, attemptId, section]);

  useEffect(() => {
    const saveResult = async (payload: any) => {
      if (savingRef.current) return;
      let fingerprint = '';
      try { fingerprint = JSON.stringify(payload); } catch { fingerprint = String(Date.now()); }
      if (fingerprint && fingerprint === lastPayloadRef.current) return;

      savingRef.current = true;
      lastPayloadRef.current = fingerprint;
      setBridgeState('saving');
      setBridgeError('');

      try {
        const endpoint = isMock && attemptId
          ? `/api/mock/attempts/${attemptId}/result`
          : `/api/tests/${id}/submit`;
        const requestBody = isMock
          ? { ...payload, result: payload, section, testId: id }
          : { ...payload, result: payload, testId: id };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Natija saqlanmadi.');
        setBridgeState('saved');
        iframeRef.current?.contentWindow?.postMessage({ type: 'ARK_RESULT_SAVED', payload: body }, '*');
        if (isMock && attemptId && section) {
          window.setTimeout(() => {
            router.replace(`/mock/${attemptId}?saved=${encodeURIComponent(section)}`);
            router.refresh();
          }, 900);
        }
      } catch (error) {
        setBridgeState('error');
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
        setBridgeState('ready');
        return;
      }
      const payload = normalizeMessage(event.data);
      if (payload) void saveResult(payload);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, id, isMock, router, section]);

  const bridgeLabel = bridgeState === 'saving'
    ? 'Natija yuborilmoqda…'
    : bridgeState === 'saved'
      ? 'Admin natijani oldi ✓'
      : bridgeState === 'error'
        ? 'Yuborishda xatolik'
        : bridgeState === 'ready'
          ? 'Admin result channel active'
          : 'Result channel preparing';

  return (
    <div className="viewerRoot">
      <div className="viewerBar">
        <Link href={backHref} className="viewerBack"><ArrowLeftIcon /> Orqaga</Link>
        <div className="viewerTitle"><b>{data.test.title}</b><span>{data.test.track.toUpperCase()} • {data.test.skill} • {data.test.fileName}</span></div>
        <div className={`viewerBridgeChip ${bridgeState}`}><span />{bridgeLabel}</div>
      </div>
      {bridgeError && <div className="viewerBridgeError">{bridgeError}</div>}
      <iframe
        ref={iframeRef}
        className="viewerFrame"
        title={data.test.title}
        sandbox="allow-forms allow-modals allow-popups allow-scripts"
        src={iframeSrc}
      />
    </div>
  );
}
