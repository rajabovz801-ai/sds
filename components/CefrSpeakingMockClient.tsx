'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './CefrSpeakingMockClient.module.css';

type Phase = 'identity' | 'video' | 'question' | 'transition' | 'uploading' | 'completed' | 'error';
type TimerMode = 'prep' | 'speak';
type Question = { part: 'Part 1' | 'Part 1.2'; number: number; text: string; prep: number; speak: number; picture?: boolean };

const questions: Question[] = [
  { part: 'Part 1', number: 1, text: 'Do you like to read?', prep: 5, speak: 30 },
  { part: 'Part 1', number: 2, text: 'Which season do you like the most?', prep: 5, speak: 30 },
  { part: 'Part 1', number: 3, text: 'Do you like sports?', prep: 5, speak: 30 },
  { part: 'Part 1.2', number: 1, text: 'What can you see in these pictures?', prep: 10, speak: 45, picture: true },
  { part: 'Part 1.2', number: 2, text: 'What is the difference between eating at home and eating out?', prep: 5, speak: 30, picture: true },
  { part: 'Part 1.2', number: 3, text: 'What are the advantages of eating out?', prep: 5, speak: 30, picture: true },
];

const picture = 'data:image/webp;base64,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';

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
  const [videoEnded, setVideoEnded] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timerMode, setTimerMode] = useState<TimerMode>('prep');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);

  const question = questions[questionIndex];
  const progress = phase === 'completed' ? 100 : Math.round((questionIndex / questions.length) * 100);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    timerRef.current = null;
    transitionRef.current = null;
  }

  function tone(freq: number, duration: number, delay = 0) {
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioContextRef.current || new Ctx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch {}
  }

  function playSignal(kind: TimerMode | 'end') {
    if (kind === 'prep') tone(620, 0.12);
    if (kind === 'speak') { tone(880, 0.11); tone(1175, 0.2, 0.14); }
    if (kind === 'end') { tone(660, 0.11); tone(440, 0.22, 0.14); }
  }

  function countdown(duration: number, onDone: () => void) {
    if (timerRef.current) clearInterval(timerRef.current);
    let left = duration;
    setSeconds(left);
    timerRef.current = setInterval(() => {
      left -= 1;
      setSeconds(Math.max(0, left));
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        window.setTimeout(onDone, 260);
      }
    }, 1000);
  }

  function beginSpeaking(index: number) {
    const item = questions[index];
    setTimerMode('speak');
    playSignal('speak');
    countdown(item.speak, () => {
      playSignal('end');
      if (index === questions.length - 1) {
        void finishRecording();
        return;
      }
      if (index === 2) {
        setPhase('transition');
        transitionRef.current = setTimeout(() => beginQuestion(3), 2600);
        return;
      }
      window.setTimeout(() => beginQuestion(index + 1), 650);
    });
  }

  function beginQuestion(index: number) {
    const item = questions[index];
    setQuestionIndex(index);
    setPhase('question');
    setTimerMode('prep');
    playSignal('prep');
    countdown(item.prep, () => beginSpeaking(index));
  }

  async function prepareSession(event: FormEvent) {
    event.preventDefault();
    const clean = candidateName.replace(/\s+/g, ' ').trim();
    if (clean.length < 2) { setError('Ismingizni yozing.'); return; }
    setCandidateName(clean);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Bu brauzer microphone recording’ni qo‘llamaydi. Chrome yoki Edge ishlating.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      setPhase('video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mikrofonga ruxsat berilmadi.');
    }
  }

  async function startPart1() {
    const stream = streamRef.current;
    if (!stream) { setError('Mikrofon ulanmagan. Sahifani qayta oching.'); return; }
    try {
      const mimeType = getMimeType();
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64000,
      });
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => setError('Audio recording’da xatolik yuz berdi.');
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(1000);
      try { await document.documentElement.requestFullscreen?.(); } catch {}
      beginQuestion(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording boshlanmadi.');
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
      body: JSON.stringify({ candidateName, type: blob.type || 'audio/webm', size: blob.size, durationSeconds }),
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
    clearTimers();
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
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio admin panelga yuborilmadi.');
      setPhase('error');
    }
  }

  async function retryUpload() {
    const blob = pendingBlobRef.current;
    if (!blob) { setError('Qayta yuborish uchun audio topilmadi.'); return; }
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
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span className={styles.mark}>A</span><div><small>ARK EDUCATION · CEFR SPEAKING</small><strong>{title}</strong></div></div>
        <div className={styles.secure}><span className={styles.liveDot} /> SECURE RECORDING</div>
      </header>

      <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>

      {phase === 'identity' && (
        <section className={`${styles.card} ${styles.identityCard}`}>
          <span className={styles.eyebrow}>SPEAKING MOCK TEST 1</span>
          <h1>Enter your name</h1>
          <p>Audio admin panelda aynan shu ism bilan saqlanadi. Keyingi bosqichda microphone ruxsati so‘raladi.</p>
          <form onSubmit={prepareSession} className={styles.nameForm}>
            <label>Ismingiz</label>
            <input autoFocus value={candidateName} onChange={(event) => setCandidateName(event.target.value)} placeholder="Masalan: Rustam Usmonov" maxLength={80} />
            <button type="submit">Continue →</button>
          </form>
          {error && <div className={styles.error}>{error}</div>}
        </section>
      )}

      {phase === 'video' && (
        <section className={styles.card}>
          <div className={styles.stageHead}><div><span className={styles.eyebrow}>OFFICIAL INSTRUCTIONS</span><h1>Speaking instructions</h1></div><span className={styles.badge}>WATCH FIRST</span></div>
          <div className={styles.videoShell}>
            <video autoPlay controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture src="/api/cefr/speaking/mock-1/video" onEnded={() => setVideoEnded(true)} onError={() => setError('Instruction video ochilmadi. Admin paneldan video biriktirilganini tekshiring.')} />
          </div>
          <div className={styles.videoFooter}><p>Video tugagach testni boshlaysiz. Recording video vaqtida yozilmaydi.</p><button disabled={!videoEnded} onClick={() => void startPart1()}>{videoEnded ? 'Start Part 1 →' : 'Watch full video'}</button></div>
          {error && <div className={styles.error}>{error}</div>}
        </section>
      )}

      {phase === 'question' && question && (
        <section className={styles.card}>
          <div className={styles.questionGrid}>
            <div className={styles.questionSide}>
              <span className={styles.eyebrow}>{question.part}</span>
              <div className={styles.questionNo}>QUESTION {question.number}</div>
              <h1>{question.text}</h1>
              {question.picture && <div className={styles.picture}><img src={picture} alt="Eating at a restaurant and eating at home" /></div>}
            </div>
            <aside className={`${styles.timer} ${timerMode === 'prep' ? styles.prep : styles.speak}`}>
              <small>{timerMode === 'prep' ? 'PREPARATION' : 'SPEAKING'}</small>
              <strong>{seconds}</strong>
              <span>{timerMode === 'prep' ? 'Read and prepare' : 'Answer now'}</span>
            </aside>
          </div>
          <div className={styles.recordingBar}><span className={styles.recordDot} /><b>Recording</b><span>{candidateName}</span><em>{questionIndex + 1} / {questions.length}</em></div>
        </section>
      )}

      {phase === 'transition' && (
        <section className={`${styles.card} ${styles.transitionCard}`}>
          <div className={styles.check}>✓</div><span className={styles.eyebrow}>PART 1 COMPLETED</span><h1>Part 1.2</h1><p>Picture questions start automatically. Recording continues.</p>
        </section>
      )}

      {phase === 'uploading' && (
        <section className={`${styles.card} ${styles.transitionCard}`}><div className={styles.loader} /><span className={styles.eyebrow}>SPEAKING COMPLETED</span><h1>Saving recording…</h1><p>{uploadProgress || 'Audio tayyorlanmoqda…'}</p></section>
      )}

      {phase === 'error' && (
        <section className={`${styles.card} ${styles.transitionCard}`}><span className={styles.eyebrow}>UPLOAD INTERRUPTED</span><h1>Recording saqlanmagan</h1><p>{error}</p><button className={styles.retry} onClick={() => void retryUpload()}>Retry upload</button></section>
      )}

      {phase === 'completed' && (
        <section className={`${styles.card} ${styles.transitionCard}`}><div className={styles.check}>✓</div><span className={styles.eyebrow}>CEFR SPEAKING</span><h1>Speaking Completed</h1><p><b>{candidateName}</b> nomidagi to‘liq audio admin panelga yuborildi.</p></section>
      )}
    </div>
  );
}
