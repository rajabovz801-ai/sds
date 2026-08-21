'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type ViewerData = {
  test: { id: string; title: string; track: string; skill: string; fileName: string };
  contentUrl: string;
};

type Props = {
  id: string;
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

export function TestViewerClient({ id, attemptId, mode, section }: Props) {
  const [data, setData] = useState<ViewerData | null | undefined>(undefined);
  const [bridgeState, setBridgeState] = useState<'idle' | 'ready' | 'saving' | 'saved' | 'error'>('idle');
  const [bridgeError, setBridgeError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savingRef = useRef(false);
  const lastPayloadRef = useRef('');

  const isMock = mode === 'mock' && Boolean(attemptId && section);
  const backHref = isMock && attemptId ? `/mock/${attemptId}` : '/dashboard';

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Test topilmadi');
        setData(body);
      })
      .catch(() => setData(null));
  }, [id]);

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
    if (!isMock || !attemptId || !section) return;

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
        const response = await fetch(`/api/mock/attempts/${attemptId}/result`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            section,
            testId: id,
            ...payload,
            result: payload,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Natija saqlanmadi.');
        setBridgeState('saved');
        window.setTimeout(() => {
          window.location.href = `/mock/${attemptId}?saved=${encodeURIComponent(section)}`;
        }, 650);
      } catch (error) {
        setBridgeState('error');
        setBridgeError(error instanceof Error ? error.message : 'Natija saqlanmadi.');
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
  }, [attemptId, id, isMock, section]);

  if (data === undefined) return <div className="viewerLoading">Test yuklanmoqda…</div>;
  if (data === null) return <div className="viewerLoading"><div style={{ textAlign: 'center' }}><b>Test topilmadi</b><div style={{ marginTop: 10 }}><Link href={backHref} className="pButton pButtonGhost">Orqaga</Link></div></div></div>;

  const bridgeLabel = bridgeState === 'saving'
    ? 'Natija saqlanmoqda…'
    : bridgeState === 'saved'
      ? 'Natija saqlandi ✓'
      : bridgeState === 'error'
        ? 'Result connection error'
        : 'Result autosave active';

  return (
    <div className="viewerRoot">
      <div className="viewerBar">
        <Link href={backHref} className="viewerBack">← Back</Link>
        <div className="viewerTitle"><b>{data.test.title}</b><span>{data.test.track.toUpperCase()} • {data.test.skill} • {data.test.fileName}</span></div>
        {isMock ? <div className={`viewerBridgeChip ${bridgeState}`}><span />{bridgeLabel}</div> : <span className="viewerModeChip">Practice mode</span>}
      </div>
      {bridgeError && <div className="viewerBridgeError">{bridgeError}</div>}
      <iframe
        ref={iframeRef}
        className="viewerFrame"
        title={data.test.title}
        sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
        src={iframeSrc}
      />
    </div>
  );
}
