import Link from 'next/link';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  FileTextIcon,
  FlameIcon,
  HeadphonesIcon,
  MicIcon,
  PenToolIcon,
  ZapIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { listDailyTasks, type CloudTest } from '@/lib/cloudTests';
import { getGamificationSummary } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

function taskIcon(test: CloudTest) {
  if (test.skill === 'reading') return <BookOpenIcon />;
  if (test.skill === 'listening') return <HeadphonesIcon />;
  if (test.skill === 'writing') return <PenToolIcon />;
  if (test.skill === 'speaking') return <MicIcon />;
  return <FileTextIcon />;
}

export default async function DailyTasksPage() {
  const student = await requireStudent('/daily-tasks');
  const [tests, summary] = await Promise.all([
    listDailyTasks(),
    getGamificationSummary(student.id),
  ]);
  const completedIds = new Set(summary.completedTestIds);

  return (
    <StudentWorkspaceShellClient student={student} active="daily-tasks">
      <div className="dailyTasksPage">
        <section className="dailyTasksHero">
          <div className="dailyTasksEyebrow"><CalendarCheckIcon /> DAILY TASKS</div>
          <h1>Kunlik vazifalar</h1>
          <p>Admin tanlagan kunlik vazifalar shu yerda chiqadi. Har bir vazifa PTS va streak tizimiga ulanadi.</p>
        </section>

        <section className="dailyTasksOverview">
          <article className="dailyTasksStat dailyTasksStatPts">
            <span className="dailyTasksStatIcon"><ZapIcon /></span>
            <div><small>YOUR PTS</small><strong>{summary.totalPts} PTS</strong><p>Bugun +{summary.todayPts} PTS</p></div>
          </article>
          <article className="dailyTasksStat dailyTasksStatStreak">
            <span className="dailyTasksStatIcon"><FlameIcon /></span>
            <div><small>STREAK</small><strong>{summary.streakDays} kun</strong><p>Ketma-ket daily task kunlari</p></div>
          </article>
          <article className="dailyTasksStat dailyTasksStatDone">
            <span className="dailyTasksStatIcon"><CheckCircleIcon /></span>
            <div><small>COMPLETED</small><strong>{summary.completedTasks}</strong><p>PTS olingan vazifalar</p></div>
          </article>
        </section>

        <section className="dailyTasksFeed">
          <header>
            <div><small>ADMIN SELECTED</small><h2>Faol vazifalar</h2></div>
            <span>{tests.length} ta vazifa</span>
          </header>

          {tests.length ? (
            <div className="dailyTasksList">
              {tests.map((test) => {
                const completed = completedIds.has(test.id);
                return (
                  <article className={`dailyTaskRow ${completed ? 'completed' : ''}`} key={test.id}>
                    <span className="dailyTaskRowIcon">{taskIcon(test)}</span>
                    <div className="dailyTaskRowCopy">
                      <small>{test.track.toUpperCase()} · {test.skill.toUpperCase()}</small>
                      <strong>{test.title}</strong>
                      <span>{completed ? 'Bajarilgan · PTS hisoblangan' : 'Bajaring va PTS oling'}</span>
                    </div>
                    <div className="dailyTaskReward">
                      <small>{completed ? 'EARNED' : 'REWARD'}</small>
                      <strong>{completed ? '✓' : `+${test.dailyTaskPoints} PTS`}</strong>
                    </div>
                    <Link href={`/test/${test.id}`} aria-label={`${test.title} testini ochish`}>
                      <span>{completed ? 'Ko‘rish' : 'Boshlash'}</span><ArrowRightIcon />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="dailyTasksEmpty">
              <strong>Hozircha daily task belgilanmagan</strong>
              <p>Admin paneldan kerakli test Daily Task sifatida yoqilganda shu yerda chiqadi.</p>
            </div>
          )}
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
