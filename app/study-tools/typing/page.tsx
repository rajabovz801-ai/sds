import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, PenToolIcon } from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import styles from '@/components/TypingLibrary.module.css';
import { requireStudent } from '@/lib/auth/server-session';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type TypingExerciseRow = {
  id: string;
  title: string;
  prompt_title: string;
  prompt: string;
  content: string;
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default async function TypingToolPage() {
  const student = await requireStudent('/study-tools/typing');
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('typing_exercises')
    .select('id,title,prompt_title,prompt,content')
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(100);

  const exercises = error ? [] : (data || []) as TypingExerciseRow[];

  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <div className={styles.page}>
        <Link href="/study-tools" className={styles.back}><ArrowLeftIcon /> Tools</Link>

        <section className={styles.hero}>
          <div>
            <span className={styles.heroIcon}><PenToolIcon /></span>
            <small className={styles.eyebrow}>TYPING PRACTICE</small>
            <h1>Typing</h1>
            <p>IELTS sample matnlarini ko‘chirib yozing, tezlik va aniqligingizni oshiring. Har exercise oxirida WPM, accuracy, errors va vaqt natijangiz chiqadi.</p>
          </div>
          <div className={styles.miniCard}>
            <small>ACTIVE EXERCISES</small>
            <strong>{exercises.length}</strong>
            <span>Admin tomonidan boshqariladi</span>
          </div>
        </section>

        <section className={styles.library}>
          <div className={styles.libraryHead}>
            <div><small>EXERCISE LIBRARY</small><h2>Typing mashqlari</h2></div>
            <span>Start bosing va matnni aynan ko‘chirib yozing.</span>
          </div>

          {exercises.length ? (
            <div className={styles.grid}>
              {exercises.map((exercise, index) => (
                <article key={exercise.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={styles.words}>{countWords(exercise.content)} WORDS</span>
                  </div>
                  <div className={styles.cardCopy}>
                    <small>{exercise.prompt_title || 'WRITING TASK 2'}</small>
                    <h3>{exercise.title}</h3>
                    <p>{exercise.prompt}</p>
                  </div>
                  <div className={styles.facts}>
                    <span><i />Speed</span><span><i />Accuracy</span><span><i />Spelling</span>
                  </div>
                  <Link href={`/study-tools/typing/${exercise.id}`} className={styles.start}>
                    <strong>Start</strong><span><ArrowRightIcon /></span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>Hozircha published typing exercise yo‘q.</div>
          )}
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
