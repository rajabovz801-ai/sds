import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  HeadphonesIcon,
  MicIcon,
  ZapIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import styles from '@/components/TypingLibrary.module.css';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedShadowing } from '@/lib/shadowing';

export const dynamic = 'force-dynamic';

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default async function ShadowingToolPage() {
  const student = await requireStudent('/study-tools/shadowing');
  const lessons = await listPublishedShadowing();

  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <div className={styles.page}>
        <Link href="/study-tools" className={styles.back}><ArrowLeftIcon /> Tools</Link>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroIcon}><HeadphonesIcon /></span>
            <div>
              <small className={styles.eyebrow}>SHADOWING PRACTICE</small>
              <h1>Shadowing</h1>
              <p>Videodagi native speech ortidan takrorlang. Pronunciation, rhythm, listening va natural fluency ustida ishlang.</p>
            </div>
          </div>
          <div className={styles.miniCard}>
            <span className={styles.miniIcon}><FileTextIcon /></span>
            <div>
              <small>ACTIVE SHADOWING</small>
              <strong>{lessons.length}</strong>
              <span>Video + script</span>
            </div>
          </div>
        </section>

        <section className={styles.library}>
          <div className={styles.libraryHead}>
            <div><small>SHADOWING LIBRARY</small><h2>Shadowing mashqlari</h2></div>
          </div>

          {lessons.length ? (
            <div className={styles.grid}>
              {lessons.map((lesson) => (
                <article key={lesson.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number}><HeadphonesIcon /><b>{String(lesson.sequenceNo).padStart(2, '0')}</b></span>
                    <span className={styles.words}><FileTextIcon /> {countWords(lesson.script)} WORDS</span>
                  </div>
                  <div className={styles.cardCopy}>
                    <small>SHADOWING {lesson.sequenceNo}</small>
                    <h3>{lesson.title}</h3>
                  </div>
                  <div className={styles.facts}>
                    <span><MicIcon />Pronunciation</span>
                    <span><ZapIcon />Rhythm</span>
                    <span><CheckCircleIcon />Fluency</span>
                  </div>
                  <Link href={`/study-tools/shadowing/${lesson.id}`} className={styles.start}>
                    <strong>Shadowing {lesson.sequenceNo}</strong><span><ArrowRightIcon /></span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>Hozircha published shadowing video yo‘q.</div>
          )}
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
