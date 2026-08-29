'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, CheckCircleIcon } from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import type { MockAttemptData, MockFlowStage } from '@/lib/mockAttempts';
import styles from './MockAttemptClient.module.css';

type SectionKey = 'listening' | 'reading';

const stageIndex: Record<MockFlowStage, number> = {
  listening_video: 0,
  listening_test: 1,
  reading_video: 2,
  reading_test: 3,
  completed: 4,
};

const steps = [
  ['01', 'Listening instructions'],
  ['02', 'Listening test'],
  ['03', 'Reading instructions'],
  ['04', 'Reading test'],
] as const;

export function MockAttemptClient({
  id,
  student,
  initialData,
}: {
  id: string;
  student: StudentSummary;
  initialData: MockAttemptData;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [videoEnded, setVideoEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/mock/attempts/${id}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Mock attempt yangilanmadi.');
    setData(body as MockAttemptData);
    return body as MockAttemptData;
  }, [id]);

  const listening = useMemo(() => data.sections.find((item) => item.section === 'listening') || null, [data.sections]);
  const reading = useMemo(() => data.sections.find((item) => item.section === 'reading') || null, [data.sections]);
  const currentIndex = stageIndex[data.progress.stage];

  const finishMock = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    setError('');
    try {
      const response = await fetch(`/api/mock/attempts/${id}/finish`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock yakunlanmadi.');
      router.replace(`/result/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock yakunlanmadi.');
      setFinishing(false);
    }
  }, [finishing, id, router]);

  useEffect(() => {
    setVideoEnded(false);
  }, [data.progress.stage]);

  useEffect(() => {
    if (data.progress.stage === 'completed' && data.attempt.status === 'in_progress') void finishMock();
  }, [data.attempt.status, data.progress.stage, finishMock]);

  async function completeVideo(section: SectionKey) {
    if (busy || !videoEnded) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/mock/attempts/${id}/progress`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Instruction holati saqlanmadi.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instruction holati saqlanmadi.');
    } finally {
      setBusy(false);
    }
  }

  const stage = data.progress.stage;
  const isVideo = stage === 'listening_video' || stage === 'reading_video';
  const videoSection: SectionKey = stage === 'reading_video' ? 'reading' : 'listening';
  const testSection: SectionKey = stage === 'reading_test' ? 'reading' : 'listening';
  const activeTest = testSection === 'listening' ? listening : reading;

  return (
    <div className={styles.root}>
      <section className={styles.identity}>
        <div className={styles.identityBrand}>
          <span className={styles.mark}>A</span>
          <div><small>ARK EDUCATION · IELTS FULL MOCK</small><strong>{data.mock.title}</strong></div>
        </div>
        <div className={styles.candidate}>
          <small>CANDIDATE ID</small>
          <strong>{data.candidate.id || 'Candidate'}</strong>
          <span>{student.firstName} {student.lastName}</span>
        </div>
      </section>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>SECURE EXAM SESSION</span>
        <h1>Listening → Reading</h1>
        <p>Har bir bosqich ketma-ket ochiladi. Listening natijasi Reading tugamaguncha ko‘rsatilmaydi; yakuniy natija ikkala section tugagandan keyin ochiladi.</p>
        <div className={styles.steps}>
          {steps.map(([number, label], index) => (
            <div key={number} className={`${styles.step} ${currentIndex === index ? styles.active : ''} ${currentIndex > index ? styles.done : ''}`}>
              <b>{currentIndex > index ? '✓' : number}</b><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {stage === 'completed' || data.attempt.status === 'completed' ? (
        <section className={styles.completeCard}>
          <div className={styles.completeIcon}><CheckCircleIcon /></div>
          <h2>{finishing ? 'Final result tayyorlanmoqda…' : 'Mock Completed'}</h2>
          <p>Listening va Reading javoblaringiz xavfsiz saqlandi. Yakuniy band hisoblanmoqda.</p>
          {data.attempt.status === 'completed' && <Link className={styles.primary} href={`/result/${id}`}>Final result <ArrowRightIcon /></Link>}
          {error && <div className={styles.error}>{error}</div>}
        </section>
      ) : (
        <section className={styles.stage}>
          <div className={styles.mainCard}>
            <div className={styles.stageHead}>
              <div>
                <small>{isVideo ? 'OFFICIAL INSTRUCTIONS' : 'EXAM SECTION'}</small>
                <h2>{isVideo ? `${videoSection === 'listening' ? 'Listening' : 'Reading'} instructions` : `${testSection === 'listening' ? 'Listening' : 'Reading'} Test`}</h2>
              </div>
              <span className={styles.badge}>{isVideo ? 'WATCH FIRST' : 'ONE ATTEMPT'}</span>
            </div>

            {isVideo ? (
              <>
                <div className={styles.videoShell}>
                  <video
                    key={`${id}-${videoSection}`}
                    src={`/api/mock/attempts/${id}/video/${videoSection}`}
                    controls
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    disablePictureInPicture
                    onEnded={() => setVideoEnded(true)}
                    onPlay={() => setError('')}
                  />
                </div>
                <p className={styles.hint}>Video oxirigacha ko‘rilgandan keyin keyingi bosqich ochiladi. Video test vaqtidan hisoblanmaydi.</p>
                <div className={styles.actionRow}>
                  <button className={styles.primary} type="button" disabled={!videoEnded || busy} onClick={() => void completeVideo(videoSection)}>
                    {busy ? 'Saqlanmoqda…' : videoEnded ? `Continue to ${videoSection === 'listening' ? 'Listening' : 'Reading'}` : 'Watch the full video'} <ArrowRightIcon />
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.testLaunch}>
                <div>
                  <div className={styles.testIcon}>{testSection === 'listening' ? 'L' : 'R'}</div>
                  <h3>{testSection === 'listening' ? 'Listening' : 'Reading'} is ready</h3>
                  <p>{testSection === 'listening' ? 'Recording test boshlanganda ishlaydi. Listening tugagach ball ko‘rsatilmaydi va siz Reading instructions bosqichiga qaytasiz.' : '60 daqiqalik Reading testni boshlang. Tugagach Full Mock avtomatik yakunlanadi va umumiy natija ochiladi.'}</p>
                  {activeTest?.test ? (
                    <Link className={styles.primary} href={`/test/${activeTest.test.id}?attempt=${id}&mode=mock&section=${testSection}`}>
                      Start {testSection === 'listening' ? 'Listening' : 'Reading'} <ArrowRightIcon />
                    </Link>
                  ) : <div className={styles.error}>Bu section uchun test hali biriktirilmagan.</div>}
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <aside className={styles.sideCard}>
            <small>SESSION OVERVIEW</small>
            <h3>Candidate session</h3>
            <div className={styles.summary}>
              <div><span>Candidate</span><b>{data.candidate.id || '—'}</b></div>
              <div><span>Status</span><b>{data.attempt.status.replaceAll('_', ' ')}</b></div>
              <div><span>Listening</span><b>{listening?.result ? 'Completed ✓' : currentIndex >= 1 ? 'In progress' : 'Waiting'}</b></div>
              <div><span>Reading</span><b>{reading?.result ? 'Completed ✓' : currentIndex >= 3 ? 'In progress' : 'Locked'}</b></div>
            </div>
            <div className={styles.notice}>Section ballari imtihon jarayonida yashiriladi. Final result faqat Reading tugagandan keyin ko‘rsatiladi.</div>
          </aside>
        </section>
      )}
    </div>
  );
}
