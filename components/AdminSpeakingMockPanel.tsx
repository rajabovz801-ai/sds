'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AdminSpeakingMockPanel.module.css';

type Recording = {
  id: string;
  student_id: string | null;
  candidate_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

type Data = {
  mock: { id: string; title: string; status: 'draft' | 'published'; instruction_video_path: string | null };
  recordings: Recording[];
};

type RecordingAction = { id: string; kind: 'download' | 'delete' } | null;

function duration(value: number | null) {
  if (!value) return '—';
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function safeFileName(value: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'student';
}

function floatToPcm16(samples: Float32Array) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = value < 0 ? Math.round(value * 32768) : Math.round(value * 32767);
  }
  return pcm;
}

async function convertToMp3(sourceBlob: Blob) {
  const audioContext = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioContext.decodeAudioData(await sourceBlob.arrayBuffer());
  } finally {
    await audioContext.close();
  }

  const sampleRate = 44100;
  const frameCount = Math.max(1, Math.ceil(decoded.duration * sampleRate));
  const offline = new OfflineAudioContext(1, frameCount, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  const pcm = floatToPcm16(rendered.getChannelData(0));

  const { Mp3Encoder } = await import('lamejs');
  const encoder = new Mp3Encoder(1, sampleRate, 96);
  const parts: BlobPart[] = [];
  const blockSize = 1152;

  for (let offset = 0; offset < pcm.length; offset += blockSize) {
    const encoded = encoder.encodeBuffer(pcm.subarray(offset, offset + blockSize));
    if (encoded.length) parts.push(Uint8Array.from(encoded) as BlobPart);
  }

  const flushed = encoder.flush();
  if (flushed.length) parts.push(Uint8Array.from(flushed) as BlobPart);
  return new Blob(parts, { type: 'audio/mpeg' });
}

export function AdminSpeakingMockPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [recordingAction, setRecordingAction] = useState<RecordingAction>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cefr-speaking', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Speaking ma’lumotlari yuklanmadi.');
      setData(body);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speaking ma’lumotlari yuklanmadi.');
      setIsError(true);
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);

  async function uploadVideo() {
    if (!video || busy) return;
    setBusy(true);
    setMessage('Instruction video yuklanmoqda…');
    setIsError(false);
    try {
      const response = await fetch('/api/admin/cefr-speaking/video-upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: video.name, type: video.type, size: video.size }),
      });
      const signed = await response.json();
      if (!response.ok) throw new Error(signed.error || 'Video upload URL yaratilmadi.');

      const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(
        signed.path,
        signed.token,
        video,
        { contentType: video.type || 'video/mp4' },
      );
      if (error) throw error;

      const saveResponse = await fetch('/api/admin/cefr-speaking', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'setVideo', videoPath: signed.path }),
      });
      const saveBody = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveBody.error || 'Video mockka biriktirilmadi.');

      setMessage('Instruction video tayyor. Endi Speaking Mock’ni ochishingiz mumkin.');
      setVideo(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Video yuklanmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(action: 'publish' | 'close') {
    if (busy) return;
    setBusy(true);
    setIsError(false);
    try {
      const response = await fetch('/api/admin/cefr-speaking', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Speaking Mock holati o‘zgarmadi.');
      setMessage(action === 'publish' ? 'CEFR Speaking Mock ochildi.' : 'CEFR Speaking Mock yopildi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speaking Mock holati o‘zgarmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function downloadMp3(row: Recording) {
    if (recordingAction) return;
    setRecordingAction({ id: row.id, kind: 'download' });
    setMessage('MP3 tayyorlanmoqda…');
    setIsError(false);
    try {
      const response = await fetch(`/api/admin/cefr-speaking/recordings/${row.id}/audio`, { cache: 'no-store' });
      if (!response.ok) throw new Error((await response.text()) || 'Audio yuklanmadi.');
      const sourceBlob = await response.blob();
      const mp3 = await convertToMp3(sourceBlob);
      const url = URL.createObjectURL(mp3);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeFileName(row.candidate_name)}_CEFR_Speaking_Mock_1.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage('MP3 yuklab olindi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'MP3 tayyorlanmadi.');
      setIsError(true);
    } finally {
      setRecordingAction(null);
    }
  }

  async function deleteRecording(row: Recording) {
    if (recordingAction) return;
    if (!window.confirm(`${row.candidate_name} recordingini butunlay o‘chirasizmi?`)) return;
    setRecordingAction({ id: row.id, kind: 'delete' });
    setMessage('Recording o‘chirilmoqda…');
    setIsError(false);
    try {
      const response = await fetch(`/api/admin/cefr-speaking/recordings/${row.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Recording o‘chirilmadi.');
      setMessage('Recording o‘chirildi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recording o‘chirilmadi.');
      setIsError(true);
    } finally {
      setRecordingAction(null);
    }
  }

  return (
    <>
      <button className={styles.launcher} type="button" onClick={() => setOpen(true)}>SPEAKING MOCK</button>
      {open && (
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <aside className={styles.drawer}>
            <header className={styles.head}>
              <div><small>ARK ADMIN · CEFR MODULE</small><h2>Speaking Mock Control</h2><p>Instruction video va o‘quvchilarning bitta to‘liq audio recordinglari.</p></div>
              <button className={styles.close} onClick={() => setOpen(false)}>×</button>
            </header>

            {message && <div className={`${styles.message} ${isError ? styles.error : ''}`}>{message}</div>}

            <section className={styles.mockCard}>
              <div className={styles.mockTop}>
                <div><small>CEFR · SPEAKING</small><h3>{data?.mock.title || 'Speaking Mock Test 1'}</h3></div>
                <span className={`${styles.status} ${data?.mock.status === 'published' ? styles.live : ''}`}>{data?.mock.status || 'loading'}</span>
              </div>
              <div className={styles.setupGrid}>
                <div className={styles.videoBox}>
                  <label>Instruction video</label>
                  <input type="file" accept="video/mp4,.mp4" onChange={(event) => setVideo(event.target.files?.[0] || null)} />
                  <small>{data?.mock.instruction_video_path ? 'Video biriktirilgan ✓' : 'MP4 · max 80 MB'}</small>
                  <button disabled={!video || busy} onClick={() => void uploadVideo()}>{busy ? 'Working…' : 'Upload video'}</button>
                </div>
                <div className={styles.actions}>
                  <b>Dashboard status</b>
                  <p>Published bo‘lsa CEFR Speaking ichida “Start Speaking” kartasi chiqadi.</p>
                  {data?.mock.status === 'published'
                    ? <button className={styles.danger} disabled={busy} onClick={() => void changeStatus('close')}>Close Speaking Mock</button>
                    : <button className={styles.primary} disabled={busy || !data?.mock.instruction_video_path} onClick={() => void changeStatus('publish')}>Open Speaking Mock</button>}
                </div>
              </div>
            </section>

            <section className={styles.results}>
              <div className={styles.resultsHead}><div><small>RECORDINGS</small><h3>Student audio</h3></div><button onClick={() => void load()}>Refresh</button></div>
              {!data?.recordings.length && <div className={styles.empty}>Hali Speaking recording kelmagan.</div>}
              <div className={styles.list}>
                {(data?.recordings || []).map((row) => {
                  const downloading = recordingAction?.id === row.id && recordingAction.kind === 'download';
                  const deleting = recordingAction?.id === row.id && recordingAction.kind === 'delete';
                  return (
                    <article className={styles.row} key={row.id}>
                      <div className={styles.meta}><strong>{row.candidate_name}</strong><span>{date(row.completed_at || row.created_at)} · {duration(row.duration_seconds)} · {row.status}</span></div>
                      {row.status === 'completed' ? (
                        <div className={styles.audioCell}>
                          <audio controls preload="none" src={`/api/admin/cefr-speaking/recordings/${row.id}/audio`} />
                          <div className={styles.rowActions}>
                            <button className={styles.download} disabled={Boolean(recordingAction)} onClick={() => void downloadMp3(row)}>{downloading ? 'Converting…' : '↓ Download MP3'}</button>
                            <button className={styles.delete} disabled={Boolean(recordingAction)} onClick={() => void deleteRecording(row)}>{deleting ? 'Deleting…' : 'Delete'}</button>
                          </div>
                        </div>
                      ) : <span className={styles.pending}>uploading…</span>}
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
