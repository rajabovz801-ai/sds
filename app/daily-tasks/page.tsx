import { CalendarCheckIcon, FlameIcon, ZapIcon } from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

export default async function DailyTasksPage() {
  const student = await requireStudent('/daily-tasks');

  return (
    <StudentWorkspaceShellClient student={student} active="daily-tasks">
      <div className="dailyTasksPage">
        <section className="dailyTasksHero">
          <div className="dailyTasksEyebrow"><CalendarCheckIcon /> DAILY TASKS</div>
          <h1>Kunlik vazifalar</h1>
          <p>IELTS, CEFR, Practice va Study Tools’dagi vazifalar shu yerda bitta tartibli oqimda ko‘rinadi.</p>
        </section>

        <section className="dailyTasksOverview">
          <article className="dailyTasksStat">
            <small>YOUR PTS</small>
            <strong>0 PTS</strong>
            <span><ZapIcon /> PTS tizimi uchun boshlang‘ich balans</span>
          </article>
          <article className="dailyTasksStat">
            <small>STREAK</small>
            <strong>0 kun</strong>
            <span><FlameIcon /> Kunlik vazifalarni ketma-ket bajaring</span>
          </article>
        </section>

        <section className="dailyTasksEmpty">
          <strong>Daily Tasks maydoni tayyor</strong>
          <p>Keyingi bosqichda yuklangan testlar shu sahifaga avtomatik ulanadi va bajarilgan vazifalar PTS hamda Leaderboard hisobiga qo‘shiladi.</p>
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
