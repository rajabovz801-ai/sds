'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, BookOpenIcon, CheckCircleIcon, MicIcon } from '@/components/UiIcons';
import { SPEAKING_DAYS, usefulPhrases } from '@/lib/speakingPractice';
import styles from './SpeakingPracticeClient.module.css';

type Recording = {
  url: string;
  seconds: number;
  type: string;
};

type ActiveRecording = {
  key: string;
  startedAt: number;
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

export function SpeakingPracticeClient({ studentName }: { studentName: string }) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [openPhrases, setOpenPhrases] = useState<Record<string, boolean>>({});
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [activeRecording, setActiveRecording] = useState<ActiveRecording | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingKeyRef = useRef('');
  const startedAtRef = useRef(0);
  const urlsRef = useRef<string[]>([]);

  const day = SPEAKING_DAYS.find((item) => item.day === selectedDay) ?? SPEAKING_DAYS[0];
  const selectedTopic = day.topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const totalQuestions = useMemo(
    () => SPEAKING_DAYS.reduce((sum, item) => sum + item.topics.reduce((topicSum, topic) => topicSum + topic.questions.length, 0), 0),
    [],
  );

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

  function questionKey(topicId: string, questionIndex: number) {
    return `d${day.day}-${topicId}-q${questionIndex + 1}`;
  }

  function chooseDay(dayNumber: number) {
    if (activeRecording) return;
    setSelectedDay(dayNumber);
    setSelectedTopicId(null);
    setOpenPhrases({});
    setMicError('');
    window.setTimeout(() => document.getElementById('speaking-topics')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  function chooseTopic(topicId: string) {
    if (activeRecording) return;
    setSelectedTopicId(topicId);
    setOpenPhrases({});
    setMicError('');
    window.setTimeout(() => document.getElementById('speaking-questions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  async function startRecording(key: string) {
    if (activeRecording || recorderRef.current?.state === 'recording') return;
    setMicError('');

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
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        const seconds = Math.max(1, (Date.now() - startedAtRef.current) / 1000);
        const savedKey = recordingKeyRef.current;
        setRecordings((current) => {
          const previous = current[savedKey];
          if (previous?.url) URL.revokeObjectURL(previous.url);
          return { ...current, [savedKey]: { url, seconds, type: blob.type } };
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setActiveRecording(null);
      };

      recorder.start(500);
      setActiveRecording({ key, startedAt: startedAtRef.current });
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setActiveRecording(null);
      setMicError(error instanceof Error ? error.message : 'Mikrofonga ruxsat berilmadi.');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  const dayRecordedCount = Object.keys(recordings).filter((key) => key.startsWith(`d${day.day}-`)).length;
  const selectedTopicRecordedCount = selectedTopic
    ? selectedTopic.questions.filter((_, index) => recordings[questionKey(selectedTopic.id, index)]).length
    : 0;

  return (
    <div className={styles.root}>
      <Link href="/practice" className={styles.back}><ArrowLeftIcon /> Practice</Link>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><MicIcon /> SPEAKING PRACTICE · PART 1</span>
          <h1>10 kunlik <em>Speaking Sprint</em></h1>
          <p>Har kuni 10 ta IELTS Part 1 topic. Topicni oching, savollarni ko‘ring, useful phrases’dan foydalaning va javobingizni ovozga yozib mashq qiling.</p>
          <div className={styles.heroFacts}>
            <span><strong>10</strong> Day</span>
            <span><strong>100</strong> Topic</span>
            <span><strong>{totalQuestions}</strong> Savol</span>
          </div>
        </div>
        <div className={styles.studentCard}>
          <span className={styles.studentIcon}><MicIcon /></span>
          <small>ACTIVE SPEAKER</small>
          <strong>{studentName}</strong>
          <p>Part 1 · short answers · daily fluency</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="speaking-days-title">
        <div className={styles.sectionHead}>
          <div>
            <span>01 · DAILY PLAN</span>
            <h2 id="speaking-days-title">Day 1 — Day 10</h2>
            <p>Bir Day tanlang. Har birida aynan 10 ta Part 1 topic mavjud.</p>
          </div>
          <strong className={styles.counter}>10 DAY</strong>
        </div>
        <div className={styles.dayGrid}>
          {SPEAKING_DAYS.map((item) => (
            <button
              type="button"
              key={item.day}
              className={`${styles.dayCard} ${selectedDay === item.day ? styles.dayCardActive : ''}`}
              onClick={() => chooseDay(item.day)}
              disabled={Boolean(activeRecording)}
            >
              <div className={styles.dayTop}><span>DAY</span><strong>{String(item.day).padStart(2, '0')}</strong></div>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
              <div className={styles.dayMeta}><span>10 topics</span><span>40 questions</span></div>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} id="speaking-topics" aria-labelledby="speaking-topics-title">
        <div className={styles.sectionHead}>
          <div>
            <span>02 · DAY {String(day.day).padStart(2, '0')}</span>
            <h2 id="speaking-topics-title">{day.title}</h2>
            <p>{day.subtitle}</p>
          </div>
          <strong className={styles.counter}>{dayRecordedCount} RECORDED</strong>
        </div>
        <div className={styles.topicGrid}>
          {day.topics.map((topic, index) => {
            const recorded = topic.questions.filter((_, questionIndex) => recordings[questionKey(topic.id, questionIndex)]).length;
            return (
              <button
                type="button"
                className={`${styles.topicCard} ${selectedTopicId === topic.id ? styles.topicCardActive : ''}`}
                key={topic.id}
                onClick={() => chooseTopic(topic.id)}
                disabled={Boolean(activeRecording)}
              >
                <div className={styles.topicNumber}>{String(index + 1).padStart(2, '0')}</div>
                <div className={styles.topicCopy}>
                  <span>PART 1 TOPIC</span>
                  <h3>{topic.title}</h3>
                  <p>{recorded}/{topic.questions.length} recorded</p>
                </div>
                <span className={styles.topicArrow}>→</span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedTopic && (
        <section className={`${styles.section} ${styles.questionSection}`} id="speaking-questions" aria-labelledby="speaking-questions-title">
          <div className={styles.questionHeader}>
            <div>
              <span>03 · SPEAK & RECORD</span>
              <h2 id="speaking-questions-title">{selectedTopic.title}</h2>
              <p>Har savolga tabiiy 20–35 soniyalik javob bering. Frazalarni yodlash uchun emas, javobni rivojlantirish uchun ishlating.</p>
            </div>
            <div className={styles.topicProgress}>
              <strong>{selectedTopicRecordedCount}/{selectedTopic.questions.length}</strong>
              <span>recorded</span>
            </div>
          </div>

          {micError && <div className={styles.error}>{micError}</div>}

          <div className={styles.questionList}>
            {selectedTopic.questions.map((question, index) => {
              const key = questionKey(selectedTopic.id, index);
              const phrasesOpen = Boolean(openPhrases[key]);
              const recording = recordings[key];
              const isRecording = activeRecording?.key === key;
              const anotherRecording = Boolean(activeRecording && !isRecording);
              const phrases = usefulPhrases(selectedTopic, question);

              return (
                <article className={`${styles.questionCard} ${isRecording ? styles.questionCardRecording : ''}`} key={key}>
                  <div className={styles.questionTitleRow}>
                    <div>
                      <span>QUESTION {String(index + 1).padStart(2, '0')}</span>
                      <h3>{question.text}</h3>
                    </div>
                    {recording && <span className={styles.savedBadge}><CheckCircleIcon /> SAVED</span>}
                  </div>

                  <div className={styles.questionActions}>
                    <button
                      type="button"
                      className={styles.phraseButton}
                      onClick={() => setOpenPhrases((current) => ({ ...current, [key]: !current[key] }))}
                    >
                      <BookOpenIcon /> {phrasesOpen ? 'Hide useful phrases' : 'Show useful phrases'} <span>{phrasesOpen ? '↑' : '↓'}</span>
                    </button>

                    {!isRecording ? (
                      <button
                        type="button"
                        className={styles.recordButton}
                        onClick={() => void startRecording(key)}
                        disabled={anotherRecording}
                      >
                        <MicIcon /> {recording ? 'Record again' : 'Record'}
                      </button>
                    ) : (
                      <button type="button" className={styles.stopButton} onClick={stopRecording}>
                        <span className={styles.liveDot} /> Stop · {formatSeconds(elapsed)}
                      </button>
                    )}
                  </div>

                  {phrasesOpen && (
                    <div className={styles.phrasePanel}>
                      <div className={styles.phrasePanelHead}><strong>Useful language</strong><span>Use 1–2 naturally</span></div>
                      <ul>{phrases.map((phrase) => <li key={phrase}>{phrase}</li>)}</ul>
                    </div>
                  )}

                  {recording && !isRecording && (
                    <div className={styles.audioPanel}>
                      <div><span><CheckCircleIcon /></span><p><strong>Recording ready</strong><small>{formatSeconds(recording.seconds)} · {recording.type.split(';')[0]}</small></p></div>
                      <audio controls src={recording.url} preload="metadata" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
