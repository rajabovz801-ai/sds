import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon } from '@/components/UiIcons';
import type { MockAttemptData } from '@/lib/mockAttempts';

const labels: Record<string, string> = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

export function MockResultClient({ id, data }: { id: string; data: MockAttemptData }) {
  if (data.attempt.status !== 'completed') {
    return <div className="mockAccessGate"><div className="mockGateIcon"><ClockIcon /></div><h1>Mock hali yakunlanmagan</h1><p>Full Mock flow’ga qayting va qolgan sectionni tugating.</p><Link className="authPrimary" href={`/mock/${id}`}><ArrowLeftIcon /> Mock sessionga qaytish</Link></div>;
  }

  const primaryValue = data.attempt.overallBand != null ? data.attempt.overallBand : data.attempt.overallScore != null ? `${data.attempt.overallScore}%` : '—';
  const primaryLabel = data.attempt.overallBand != null ? 'Overall band' : 'Overall score';

  return (
    <>
      <section className="resultHero">
        <div className="resultHeroCopy">
          <span className="authEyebrow">FINAL MOCK RESULT</span>
          <h1>{data.mock.title}</h1>
          <p>{data.candidate.id ? `${data.candidate.id} · ` : ''}{data.mock.track.toUpperCase()} · Completed {data.attempt.completedAt ? new Date(data.attempt.completedAt).toLocaleString('uz-UZ') : ''}</p>
        </div>
        <div className="resultScoreCard"><span>{primaryLabel}</span><strong>{primaryValue}</strong><small>Listening + Reading</small></div>
      </section>

      <section className="resultGrid">
        {data.sections.map((item, index) => {
          const result = item.result;
          const label = labels[item.section] || item.section;
          const details = result?.details || {};
          const score = result?.raw_score != null ? `${result.raw_score}${result.max_score != null ? ` / ${result.max_score}` : ''}` : '—';
          const percentage = result?.raw_score != null && result.max_score ? Math.round((Number(result.raw_score) / Number(result.max_score)) * 100) : null;
          return (
            <article className="resultSectionCard" key={item.section}>
              <div className="resultCardTop"><span>{String(index + 1).padStart(2, '0')}</span><b>{label}</b></div>
              <div className="resultMainValue"><strong>{result?.band ?? '—'}</strong><span>Band</span></div>
              <div className="resultStats">
                <div><span>Score</span><b>{score}</b></div>
                <div><span>Correct</span><b>{details.correct ?? result?.raw_score ?? '—'}</b></div>
                <div><span>Wrong</span><b>{details.wrong ?? '—'}</b></div>
                <div><span>Unanswered</span><b>{details.unanswered ?? '—'}</b></div>
                <div><span>Accuracy</span><b>{percentage != null ? `${percentage}%` : '—'}</b></div>
              </div>
              <p>{item.test?.title || `${label} section`}</p>
            </article>
          );
        })}
      </section>

      <section className="resultFooterCard">
        <div><span className="authEyebrow">MOCK COMPLETED</span><h2>Yakuniy natija saqlandi</h2><p>Listening va Reading natijalari Candidate ID bilan Full Mock tarixiga yozildi.</p></div>
        <div className="resultActions"><Link className="authPrimary" href="/mock">Dashboard <span><ArrowRightIcon /></span></Link><Link className="authSecondary" href="/mock"><ArrowLeftIcon /> Mock bo‘limi</Link></div>
      </section>
    </>
  );
}
