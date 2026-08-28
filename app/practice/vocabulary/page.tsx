import Link from 'next/link';
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
  HomeIcon,
  LibraryIcon,
  RepeatIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listPublishedTestsByWithAttempts } from '@/lib/cloudTests';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function VocabularyQuizPage() {
  const student = await requireStudent('/practice/vocabulary');
  const [ieltsTests, cefrTests] = await Promise.all([
    listPublishedTestsByWithAttempts('ielts', 'vocabulary', student.id),
    listPublishedTestsByWithAttempts('cefr', 'vocabulary', student.id),
  ]);
  const tests = [...ieltsTests, ...cefrTests].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  const now = Date.now();

  return (
    <StudentWorkspaceShellClient student={student} active="practice">
      <div className="workspacePage libraryWorkspace sidebarLibrary sidebarLibrary-vocabulary">
        <nav className="libraryBreadcrumb" aria-label="Breadcrumb">
          <Link href="/mock" aria-label="Dashboard"><HomeIcon /></Link>
          <i />
          <Link href="/practice">Practice</Link>
          <span>›</span>
          <strong>Vocabulary Quiz</strong>
        </nav>

        <section className="workspaceHero workspaceHeroCompact libraryHero sidebarLibraryHero">
          <div className="workspaceHeroCopy">
            <span className="workspaceEyebrow"><SparklesIcon /> PRACTICE · VOCABULARY</span>
            <h1>Vocabulary Quiz</h1>
            <p>Reading passage’lardan olingan muhim so‘zlarni quiz orqali mustahkamlang. Har bir passage alohida vocabulary quiz sifatida saqlanadi.</p>
          </div>
          <div className="libraryHeroIcon libraryHeroIcon-reading"><BookOpenIcon /></div>
        </section>

        <div className="libraryHeading sidebarLibraryHeading">
          <div><span>VOCABULARY QUIZZES</span><h2>Passage vocabulary</h2></div>
          <strong className={styles.count}>{tests.length} ta quiz</strong>
        </div>

        {tests.length ? (
          <section className="testLibraryGrid sidebarTestGrid">
            {tests.map((test, index) => {
              const dailyActive = Boolean(
                test.dailyTaskEnabled
                && test.dailyTaskExpiresAt
                && Date.parse(test.dailyTaskExpiresAt) > now,
              );
              return (
                <article className={`testLibraryCard sidebarTestCard ${styles.quizCard}`} key={test.id}>
                  <div className="testLibraryTop">
                    <span><FileTextIcon /></span>
                    <small>QUIZ {String(index + 1).padStart(2, '0')}</small>
                  </div>
                  <div className="testLibraryCopy">
                    <span>VOCABULARY QUIZ · {test.track.toUpperCase()}</span>
                    <h3>{test.title}</h3>
                  </div>
                  <div className={`sidebarAttemptMeta ${styles.quizMeta}`} aria-label={`${test.attemptCount || 0} attempts`}>
                    <RepeatIcon />
                    <span><strong>{test.attemptCount || 0}</strong> {(test.attemptCount || 0) === 1 ? 'attempt' : 'attempts'}</span>
                    <b className={dailyActive ? styles.pointsActive : styles.points}>{test.dailyTaskPoints || 20} PTS{dailyActive ? ' · DAILY' : ''}</b>
                  </div>
                  <Link href={`/test/${test.id}`} className="sidebarTestOpen" prefetch>
                    <strong>Boshlash</strong><ArrowRightIcon />
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="libraryEmpty sidebarLibraryEmpty">
            <span><LibraryIcon /></span>
            <small>VOCABULARY QUEUE</small>
            <h2>Vocabulary quiz hali qo‘shilmagan.</h2>
            <p>Admin HTML quiz yuklagan zahoti passage nomi bilan shu yerda avtomatik ko‘rinadi.</p>
            <Link href="/practice">Practice bo‘limiga qaytish <ArrowRightIcon /></Link>
          </section>
        )}
      </div>
    </StudentWorkspaceShellClient>
  );
}
