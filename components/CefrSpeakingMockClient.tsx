'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './CefrSpeakingMockClient.module.css';

type Phase = 'identity' | 'video' | 'uploading' | 'completed' | 'error';

function getMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function CefrSpeakingMockClient({ title }: { title: string }) {
  const [phase, setPhase] = useState<Phase>('identity');
  const [candidateName, setCandidateName] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [videoProgress, setVideoProgress] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const pendingBlobRef = useRef<Blob | null>(null);
  const finishingRef = useRef(false);

  const progress = phase === 'completed' ? 100 : phase === 'video' ? videoProgress : 0;

  async function startRecording(stream: MediaStream) {
    const mimeType = getMimeType();
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 64000,
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => setError('Audio recording’da xatolik yuz berdi.');

    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(1000);
  }

  async function prepareSession(event: FormEvent) {
    event.preventDefault();
    const clean = candidateName.replace(/\s+/g, ' ').trim();
    if (clean.length < 2) {
      setError('Ismingizni yozing.');
      return;
    }

    setCandidateName(clean);
    setError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Bu brauzer microphone recording’ni qo‘llamaydi. Chrome yoki Edge ishlating.');
      }

      try {
        await document.documentElement.requestFullscreen?.();
      } catch {}

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      await startRecording(stream);
      setVideoProgress(0);
      setPhase('video');
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(err instanceof Error ? err.message : 'Mikrofonga ruxsat berilmadi.');
    }
  }

  async function stopRecorder() {
    const recorder = recorderRef.current;
    if (!recorder) throw new Error('Recording topilmadi.');

    if (recorder.state === 'inactive') {
      return new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    }

    return await new Promise<Blob>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Recording yakunlanmadi.')), 5000);
      recorder.onstop = () => {
        clearTimeout(timeout);
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });
  }

  async function uploadRecording(blob: Blob) {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setUploadProgress('Audio xavfsiz storage’ga yuklanmoqda…');

    const response = await fetch('/api/cefr/speaking/mock-1/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        candidateName,
        type: blob.type || 'audio/webm',
        size: blob.size,
        durationSeconds,
      }),
    });

    const signed = await response.json();
    if (!response.ok) throw new Error(signed.error || 'Audio upload URL yaratilmadi.');

    const contentType = (blob.type || 'audio/webm').split(';')[0];
    const { error: uploadError } = await supabase.storage
      .from(signed.bucket)
      .uploadToSignedUrl(signed.path, signed.token, blob, { contentType });

    if (uploadError) throw uploadError;

    setUploadProgress('Recording admin panelga biriktirilmoqda…');
    const completeResponse = await fetch('/api/cefr/speaking/mock-1/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recordingId: signed.recordingId }),
    });

    const completeBody = await completeResponse.json();
    if (!completeResponse.ok) throw new Error(completeBody.error || 'Recording yakunlanmadi.');
  }

  async function finishRecording() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase('uploading');
    setError('');

    try {
      const blob = await stopRecorder();
      pendingBlobRef.current = blob;

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      await uploadRecording(blob);
      pendingBlobRef.current = null;
      setPhase('completed');

      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio admin panelga yuborilmadi.');
      setPhase('error');
    } finally {
      finishingRef.current = false;
    }
  }

  async function retryUpload() {
    const blob = pendingBlobRef.current;
    if (!blob) {
      setError('Qayta yuborish uchun audio topilmadi.');
      return;
    }

    setPhase('uploading');
    setError('');

    try {
      await uploadRecording(blob);
      pendingBlobRef.current = null;
      setPhase('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio qayta yuborilmadi.');
      setPhase('error');
    }
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (recorderRef.current?.state === 'recording' || phase === 'uploading') {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark}>A</span>
          <div>
            <small>ARK EDUCATION · CEFR SPEAKING</small>
            <strong>{title}</strong>
          </div>
        </div>
        <div className={styles.secure}>
          <span className={styles.liveDot} />
          {phase === 'video' ? 'RECORDING LIVE' : 'SECURE RECORDING'}
        </div>
      </header>

      <div className={styles.progressTrack}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {phase === 'identity' && (
        <section className={`${styles.card} ${styles.identityCard}`}>
          <span className={styles.eyebrow}>SPEAKING MOCK TEST 1</span>
          <h1>Enter your name</h1>
          <p>Audio admin panelda aynan shu ism bilan saqlanadi. Continue bosilgach microphone ruxsati olinadi va video bilan birga recording boshlanadi.</p>
          <form onSubmit={prepareSession} className={styles.nameForm}>
            <label>Ismingiz</label>
            <input
              autoFocus
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="Masalan: Rustam Usmonov"
              maxLength={80}
            />
            <button type="submit">Continue →</button>
          </form>
          {error && <div className={styles.error}>{error}</div>}
        </section>
      )}

      {phase === 'video' && (
        <section className={styles.card}>
          <div className={styles.stageHead}>
            <div>
              <span className={styles.eyebrow}>CEFR SPEAKING MOCK</span>
              <h1>Speaking Test</h1>
            </div>
            <span className={styles.badge}>RECORDING</span>
          </div>

          <div className={styles.videoShell}>
            <video
              autoPlay
              controls
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              src="/api/cefr/speaking/mock-1/video"
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (!Number.isFinite(video.duration) || video.duration <= 0) return;
                setVideoProgress(Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100)));
              }}
              onEnded={() => void finishRecording()}
              onError={() => setError('Speaking video ochilmadi. Admin paneldan video biriktirilganini tekshiring.')}
            />
          </div>

          <div className={styles.videoFooter}>
            <p><b>Recording davom etmoqda.</b> Video ichidagi savollarga berilgan barcha javoblaringiz bitta audio faylga yoziladi.</p>
          </div>

          <div className={styles.recordingBar}>
            <span className={styles.recordDot} />
            <b>Recording</b>
            <span>{candidateName}</span>
            <em>Video + answers</em>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </section>
      )}

      {phase === 'uploading' && (
        <section className={`${styles.card} ${styles.transitionCard}`}>
          <div className={styles.loader} />
          <span className={styles.eyebrow}>SPEAKING COMPLETED</span>
          <h1>Saving recording…</h1>
          <p>{uploadProgress || 'Audio tayyorlanmoqda…'}</p>
        </section>
      )}

      {phase === 'error' && (
        <section className={`${styles.card} ${styles.transitionCard}`}>
          <span className={styles.eyebrow}>UPLOAD INTERRUPTED</span>
          <h1>Recording saqlanmagan</h1>
          <p>{error}</p>
          <button className={styles.retry} onClick={() => void retryUpload()}>Retry upload</button>
        </section>
      )}

      {phase === 'completed' && (
        <section className={`${styles.card} ${styles.transitionCard}`}>
          <div className={styles.check}>✓</div>
          <span className={styles.eyebrow}>CEFR SPEAKING</span>
          <h1>Speaking Completed</h1>
        </section>
      )}
    </div>
  );
}
