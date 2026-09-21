import {
  BookOpenIcon,
  FlameIcon,
  HeadphonesIcon,
  TargetIcon,
} from '@/components/UiIcons';
import type { DashboardData } from '@/lib/dashboard';

function fmtBand(value: number | null) {
  return value === null ? '—' : value.toFixed(1);
}

export function StudentProgressClient({ data }: { data: DashboardData }) {
  return (
    <div className="progressHub">
      <header className="progressHubHeader">
        <span className="routeRedEyebrow">YOUR PROGRESS</span>
        <h1>Progress</h1>
        <p>Your latest IELTS results and overall improvement in one place.</p>
      </header>

      <section className="progressMetricGrid">
        <article>
          <span className="progressMetricIcon"><TargetIcon /></span>
          <small>Overall Band</small>
          <strong>{fmtBand(data.overallBand)}</strong>
        </article>
        <article>
          <span className="progressMetricIcon"><BookOpenIcon /></span>
          <small>Reading</small>
          <strong>{fmtBand(data.readingBand)}</strong>
        </article>
        <article>
          <span className="progressMetricIcon"><HeadphonesIcon /></span>
          <small>Listening</small>
          <strong>{fmtBand(data.listeningBand)}</strong>
        </article>
        <article>
          <span className="progressMetricIcon"><FlameIcon /></span>
          <small>Streak</small>
          <strong>{data.studyStreak}</strong>
        </article>
      </section>

      <section className="progressRecentPanel">
        <header>
          <div>
            <span className="routeRedEyebrow">HISTORY</span>
            <h2>Recent results</h2>
          </div>
          <strong>{data.testsCompleted} tests</strong>
        </header>

        {data.recentResults.length ? (
          <div className="progressResultList">
            {data.recentResults.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.skill} · {new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short' }).format(new Date(item.date))}</span>
                </div>
                <b>{item.band === null ? item.score : item.band.toFixed(1)}</b>
              </article>
            ))}
          </div>
        ) : (
          <div className="routeEmptyState">No completed tests yet.</div>
        )}
      </section>
    </div>
  );
}
