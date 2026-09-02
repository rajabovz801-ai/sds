'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as lame from '@breezystack/lamejs';
import { ArrowLeftIcon, BookOpenIcon, CheckCircleIcon, MicIcon } from '@/components/UiIcons';
import { SPEAKING_DAYS, usefulPhrases } from '@/lib/speakingPractice';
import styles from './SpeakingPracticeClient.module.css';

type Recording = {
  url: string;
  seconds: number;
  type: string;
  blob: Blob;
};

type ActiveRecording = {
  key: string;
  startedAt: number;
};

type DeliveryState = 'idle' | 'sending' | 'sent' | 'error';

type ProgressResponse = {
  ok?: boolean;
  completedKeys?: string[];
  completedCount?: number;
  totalQuestions?: number;
};

function supportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function toInt16(samples: Float32Array) {
  const output = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

async function encodeMp3(source: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await source.arrayBuffer());
    const samples = toInt16(decoded.getChannelData(0));
    const encoder = new lame.Mp3Encoder(1, decoded.sampleRate, 64);
    const parts: BlobPart[] = [];
    const block = 1152;

    for (let offset = 0; offset < samples.length; offset += block) {
      const encoded = encoder.encodeBuffer(samples.subarray(offset, offset + block));
      if (encoded.length > 0) parts.push(Uint8Array.from(encoded).buffer);
    }

    const tail = encoder.flush();
    if (tail.length > 0) parts.push(Uint8Array.from(tail).buffer);
    const mp3 = new Blob(parts, { type: 'audio/mpeg' });
    if (mp3.size < 100) throw new Error('MP3 encoding failed');
    return mp3;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function SpeakingPracticeClient({ studentName }: { studentName: string }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [openPhrases, setOpenPhrases] = useState<Record<string, boolean>>({});
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [deliveryStates, setDeliveryStates] = useState<Record<string, DeliveryState>>({});
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [activeRecording, setActiveRecording] = useState<ActiveRecording | null>(null);
  const [encodingKey, setEncodingKey] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingKeyRef = useRef('');
  const startedAtRef = useRef(0);
  const urlsRef = useRef<string[]>([]);
  const deepLinkQuestionRef = useRef<number | null>(null);

  const day = selectedDay === null
    ? null
    : SPEAKING_DAYS.find((item) => item.day === selectedDay) ?? null;
  const selectedTopic = day?.topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const totalQuestions = useMemo(
    () => SPEAKING_DAYS.reduce((sum, item) => sum + item.topics.reduce((topicSum, topic) => topicSum + topic.questions.length, 0), 0),
    [],
  );
  const interactionBusy = Boolean(activeRecording || encodingKey);

  function questionKey(dayNumber: number, topicId: string, questionIndex: number) {
    return `d${dayNumber}-${topicId}-q${questionIndex + 1}`;
  }

  function isCompleted(key: string) {
    return completedKeys.has(key) || Boolean(recordings[key]);
  }

  function markCompleted(key: string) {
    setCompletedKeys((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/speaking-recording', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({})) as ProgressResponse;
        if (!response.ok || !data?.ok) return;
        if (!cancelled) setCompletedKeys(new Set(Array.isArray(data.completedKeys) ? data.completedKeys : []));
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setProgressLoaded(true); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dayParam = Number(params.get('day'));
    const topicParam = String(params.get('topic') || '').trim();
    const questionParam = Number(params.get('q'));
    const targetDay = SPEAKING_DAYS.find((item) => item.day === dayParam);
    const targetTopic = targetDay?.topics.find((item) => item.id === topicParam);
    if (!targetDay) return;

    setSelectedDay(targetDay.day);
    if (targetTopic) setSelectedTopicId(targetTopic.id);
    if (targetTopic && Number.isInteger(questionParam) && questionParam >= 1 && questionParam <= targetTopic.questions.length) {
      deepLinkQuestionRef.current = questionParam - 1;
    }
  }, []);

  useEffect(() => {
    if (!day || !selectedTopic || deepLinkQuestionRef.current === null) return;
    const index = deepLinkQuestionRef.current;
    deepLinkQuestionRef.current = null;
    const key = questionKey(day.day, selectedTopic.id, index);
    window.setTimeout(() => document.getElementById(`speaking-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }, [day, selectedTopic]);

  useEffect(() => {
    if (!activeRecording) {
      setElapsed(0);
      return;
    }
    const update = () => setElapsed((Date.now() - activeRecording.startedAt) / 1000);
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [activeRecording]);

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function scrollToStage() {
    window.setTimeout(() => document.getElementById('speaking-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  function chooseDay(dayNumber: number) {
    if (interactionBusy) return;
    setSelectedDay(dayNumber);
    setSelectedTopicId(null);
    setOpenPhrases({});
    setMicError('');
    scrollToStage();
  }

  function chooseTopic(topicId: string) {
    if (interactionBusy || !day) return;
    setSelectedTopicId(topicId);
    setOpenPhrases({});
    setMicError('');
    scrollToStage();
  }

  function backToDays() {
    if (interactionBusy) return;
    setSelectedDay(null);
    setSelectedTopicId(null);
    setOpenPhrases({});
    setMicError('');
    scrollToStage();
  }

  function backToTopics() {
    if (interactionBusy) return;
    setSelectedTopicId(null);
    setOpenPhrases({});
    setMicError('');
    scrollToStage();
  }

  async function startRecording(key: string) {
    if (interactionBusy || recorderRef.current?.state === 'recording') return;
    setMicError('');
    setDeliveryStates((current) => ({ ...current, [key]: 'idle' }));

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Bu brauzer microphone recording’ni qo‘llamaydi. Chrome yoki Edge ishlating.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mimeType = supportedMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64000,
      });

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordingKeyRef.current = key;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => setMicError('Recording vaqtida xatolik yuz berdi. Qayta urinib ko‘ring.');
      recorder.onstop = async () => {
        const source = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const seconds = Math.max(1, (Date.now() - startedAtRef.current) / 1000);
        const savedKey = recordingKeyRef.current;

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setActiveRecording(null);
        setEncodingKey(savedKey);

        try {
          const mp3 = await encodeMp3(source);
          const url = URL.createObjectURL(mp3);
          urlsRef.current.push(url);
          setRecordings((current) => {
            const previous = current[savedKey];
            if (previous?.url) URL.revokeObjectURL(previous.url);
            return { ...current, [savedKey]: { url, seconds, type: 'audio/mpeg', blob: mp3 } };
          });
        } catch (error) {
          console.error('Speaking MP3 encoding failed', error);
          setMicError('Ovoz yozildi, lekin MP3 tayyorlashda xatolik bo‘ldi. Qayta Record qilib ko‘ring.');
        } finally {
          setEncodingKey((current) => current === savedKey ? null : current);
        }
      };

      recorder.start(500);
      setActiveRecording({ key, startedAt: startedAtRef.current });
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setActiveRecording(null);
      setEncodingKey(null);
      setMicError(error instanceof Error ? error.message : 'Mikrofonga ruxsat berilmadi.');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function sendRecordingToBot(key: string, topicId: string, questionIndex: number) {
    const recording = recordings[key];
    if (!recording || !day || deliveryStates[key] === 'sending' || deliveryStates[key] === 'sent') return;

    setMicError('');
    setDeliveryStates((current) => ({ ...current, [key]: 'sending' }));
    try {
      const form = new FormData();
      form.append('audio', recording.blob, `${key}.mp3`);
      form.append('day', String(day.day));
      form.append('topicId', topicId);
      form.append('questionIndex', String(questionIndex));
      form.append('duration', String(Math.round(recording.seconds)));

      const response = await fetch('/api/speaking-recording', {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (data?.saved) markCompleted(key);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'delivery_failed');
      markCompleted(key);
      setDeliveryStates((current) => ({ ...current, [key]: 'sent' }));
    } catch (error) {
      console.error('Speaking Telegram delivery failed', error);
      setDeliveryStates((current) => ({ ...current, [key]: 'error' }));
      setMicError('Javob saqlandi, lekin yetkazishda xatolik bo‘ldi. Tizim holatini ustoz tekshirishi mumkin.');
    }
  }

  const completedCount = useMemo(() => {
    const keys = new Set(completedKeys);
    Object.keys(recordings).forEach((key) => keys.add(key));
    return keys.size;
  }, [completedKeys, recordings]);

  const dayRecordedCount = day
    ? day.topics.reduce((sum, topic) => sum + topic.questions.filter((_, index) => isCompleted(questionKey(day.day, topic.id, index))).length, 0)
    : 0;
  const selectedTopicRecordedCount = day && selectedTopic
    ? selectedTopic.questions.filter((_, index) => isCompleted(questionKey(day.day, selectedTopic.id, index))).length
    : 0;

  return (
    <div className={styles.root}>
      <Link href="/practice" className={styles.back}><ArrowLeftIcon /> Practice</Link>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><MicIcon /> SPEAKING PRACTICE · PART 1</span>
          <h1>10 kunlik <em>Speaking Sprint</em></h1>
          <p>Avval Day bo‘limini, keyin topicni tanlang. Savollar, useful phrases va recording aynan tanlangan topic ichida ochiladi.</p>
          <div className={styles.heroFacts}>
            <span><strong>10</strong> Day</span>
            <span><strong>100</strong> Topic</span>
            <span><strong>{totalQuestions}</strong> Savol</span>
            <span><strong>{progressLoaded ? completedCount : '—'}</strong> Completed</span>
          </div>
        </div>
        <div className={styles.studentCard}>
          <span className={styles.studentIcon}><MicIcon /></span>
          <small>ACTIVE SPEAKER</small>
          <strong>{studentName}</strong>
          <p>Part 1 · short answers · daily fluency</p>
        </div>
      </section>

      <div id="speaking-stage" style={{ scrollMarginTop: 104 }}>
        {!day && (
          <section className={styles.section} aria-labelledby="speaking-days-title">
            <div className={styles.sectionHead}>
              <div>
                <span>01 · DAILY PLAN</span>
                <h2 id="speaking-days-title">Day 1 — Day 10</h2>
                <p>Bir bo‘limni tanlang. Har birining ichida aynan 10 ta IELTS Part 1 topic mavjud.</p>
              </div>
              <strong className={styles.counter}>{completedCount}/{totalQuestions} DONE</strong>
            </div>
            <div className={styles.dayGrid}>
              {SPEAKING_DAYS.map((item) => {
                const itemTotal = item.topics.reduce((sum, topic) => sum + topic.questions.length, 0);
                const itemDone = item.topics.reduce(
                  (sum, topic) => sum + topic.questions.filter((_, index) => isCompleted(questionKey(item.day, topic.id, index))).length,
                  0,
                );
                return (
                  <button
                    type="button"
                    key={item.day}
                    className={styles.dayCard}
                    onClick={() => chooseDay(item.day)}
                    disabled={interactionBusy}
                  >
                    <div className={styles.dayTop}><span>DAY</span><strong>{String(item.day).padStart(2, '0')}</strong></div>
                    <h3>{item.title}</h3>
                    <p>{item.subtitle}</p>
                    <div className={styles.dayMeta}><span>10 topics</span><span>{itemDone}/{itemTotal} completed</span></div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {day && !selectedTopic && (
          <section className={styles.section} aria-labelledby="speaking-topics-title">
            <button type="button" className={styles.back} onClick={backToDays} disabled={interactionBusy} style={{ marginBottom: 16 }}>
              <ArrowLeftIcon /> Barcha bo‘limlar
            </button>
            <div className={styles.sectionHead}>
              <div>
                <span>DAY {String(day.day).padStart(2, '0')} · PART 1 TOPICS</span>
                <h2 id="speaking-topics-title">{day.title}</h2>
                <p>{day.subtitle} Topicni tanlang — uning savollari, useful phrases va recording ichkarida ochiladi.</p>
              </div>
              <strong className={styles.counter}>{dayRecordedCount} COMPLETED</strong>
            </div>
            <div className={styles.topicGrid}>
              {day.topics.map((topic, index) => {
                const recorded = topic.questions.filter((_, questionIndex) => isCompleted(questionKey(day.day, topic.id, questionIndex))).length;
                return (
                  <button
                    type="button"
                    className={styles.topicCard}
                    key={topic.id}
                    onClick={() => chooseTopic(topic.id)}
                    disabled={interactionBusy}
                  >
                    <div className={styles.topicNumber}>{recorded === topic.questions.length ? '✓' : String(index + 1).padStart(2, '0')}</div>
                    <div className={styles.topicCopy}>
                      <span>PART 1 TOPIC</span>
                      <h3>{topic.title}</h3>
                      <p>{recorded}/{topic.questions.length} completed</p>
                    </div>
                    <span className={styles.topicArrow}>→</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {day && selectedTopic && (
          <section className={`${styles.section} ${styles.questionSection}`} aria-labelledby="speaking-questions-title">
            <button type="button" className={styles.back} onClick={backToTopics} disabled={interactionBusy} style={{ marginBottom: 17 }}>
              <ArrowLeftIcon /> {day.title}
            </button>

            <div className={styles.questionHeader}>
              <div>
                <span>DAY {String(day.day).padStart(2, '0')} · {day.title.toUpperCase()}</span>
                <h2 id="speaking-questions-title">{selectedTopic.title}</h2>
                <p>Har savolga tabiiy 20–35 soniyalik javob bering. Useful phrases’dan 1–2 tasini tabiiy ishlatib, keyin javobingizni Record orqali qayta tinglang.</p>
              </div>
              <div className={styles.topicProgress}>
                <strong>{selectedTopicRecordedCount}/{selectedTopic.questions.length}</strong>
                <span>completed</span>
              </div>
            </div>

            {micError && <div className={styles.error}>{micError}</div>}

            <div className={styles.questionList}>
              {selectedTopic.questions.map((question, index) => {
                const key = questionKey(day.day, selectedTopic.id, index);
                const phrasesOpen = Boolean(openPhrases[key]);
                const recording = recordings[key];
                const completed = isCompleted(key);
                const isRecording = activeRecording?.key === key;
                const isEncoding = encodingKey === key;
                const anotherBusy = Boolean((activeRecording && !isRecording) || (encodingKey && !isEncoding));
                const delivery = deliveryStates[key] || 'idle';
                const phrases = usefulPhrases(selectedTopic, question);

                return (
                  <article id={`speaking-${key}`} className={`${styles.questionCard} ${isRecording ? styles.questionCardRecording : ''}`} key={key}>
                    <div className={styles.questionTitleRow}>
                      <div>
                        <span>QUESTION {String(index + 1).padStart(2, '0')}</span>
                        <h3>{question.text}</h3>
                      </div>
                      {completed && <span className={styles.savedBadge}><CheckCircleIcon /> {recording ? 'MP3 READY' : 'COMPLETED'}</span>}
                    </div>

                    <div className={styles.questionActions}>
                      <button
                        type="button"
                        className={styles.phraseButton}
                        style={{ fontSize: 10.5 }}
                        onClick={() => setOpenPhrases((current) => ({ ...current, [key]: !current[key] }))}
                      >
                        <BookOpenIcon /> {phrasesOpen ? 'Hide useful phrases' : 'Show useful phrases'} <span>{phrasesOpen ? '↑' : '↓'}</span>
                      </button>

                      {isRecording ? (
                        <button type="button" className={styles.stopButton} onClick={stopRecording}>
                          <span className={styles.liveDot} /> Stop · {formatSeconds(elapsed)}
                        </button>
                      ) : isEncoding ? (
                        <button type="button" className={styles.encodingButton} disabled>
                          MP3 tayyorlanmoqda…
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.recordButton}
                          onClick={() => void startRecording(key)}
                          disabled={anotherBusy}
                        >
                          <MicIcon /> {completed ? 'Record again' : 'Record'}
                        </button>
                      )}
                    </div>

                    {phrasesOpen && (
                      <div className={styles.phrasePanel}>
                        <div className={styles.phrasePanelHead}>
                          <strong style={{ fontSize: 11.5 }}>Useful language</strong>
                          <span style={{ fontSize: 9.5 }}>Use 1–2 naturally</span>
                        </div>
                        <ul>
                          {phrases.map((phrase) => (
                            <li key={phrase} style={{ fontSize: 12.5, lineHeight: 1.6, color: '#4f5969', paddingLeft: 16 }}>{phrase}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recording && !isRecording && !isEncoding && (
                      <div className={styles.audioPanel}>
                        <div className={styles.audioMeta}>
                          <span><CheckCircleIcon /></span>
                          <p><strong>MP3 recording ready</strong><small>{formatSeconds(recording.seconds)} · audio/mpeg</small></p>
                        </div>
                        <div className={styles.audioActions}>
                          <audio controls src={recording.url} preload="metadata" />
                          <button
                            type="button"
                            className={`${styles.sendButton} ${delivery === 'sent' ? styles.sendButtonSent : ''}`}
                            onClick={() => void sendRecordingToBot(key, selectedTopic.id, index)}
                            disabled={delivery === 'sending' || delivery === 'sent'}
                          >
                            {delivery === 'sending'
                              ? 'Yuborilmoqda…'
                              : delivery === 'sent'
                                ? 'Botga yuborildi ✓'
                                : delivery === 'error'
                                  ? 'Qayta yuborish'
                                  : 'Botga yuborish'}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
