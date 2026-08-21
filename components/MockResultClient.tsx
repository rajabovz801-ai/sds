'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SectionResult = {
  section: string;
  test: { id: string; title: string; skill: string; file_name: string } | null;
  result: {
    raw_score: number | null;
    max_score: number | null;
    band: number | null;
    details?: { correct?: number | null; wrong?: number | null; unanswered?: number | null; [key: string]: unknown };
  } | null;
};

type ResultData = {
  attempt: { id: string; status: string; startedAt: string; completedAt: string | null; overallScore: number | null; overallBand: number | null };
  mock: { id: string; title: string; track: string; status: string };
  sections: SectionResult[];
};

const labels: Record<string, string> = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

export function MockResultClient({ id }: { id: string }) {
  const [data, setData] = useState<ResultData | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/mock/attempts/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Result topilmadi.');
        setData(body);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Result topilmadi.');
        setData(null);
      });
  }, [id]);

  if (data === undefined) return <div className="mockLoading">Final result yuklanmoqda…</div>;
  if (!data) return <div className="mockAccessGate"><div className="mockGateIcon">!</div><h1>Result topilmadi</h1><p>{error}</p><Link className="authPrimary" href="/mock">Mock bo‘limiga qaytish</Link></div>;
  if (data.attempt.status !== 'completed') return <div className="mockAccessGate"><div className="mockGateIcon">…</div><h1>Mock hali yakunlanmagan</h1><p>Barcha sectionlarni tugatib, “Mockni yakunlash” tugmasini bosing.</p><Link className="authPrimary" href={`/mock/${id}`}>Mock sessionga qaytish</Link></div>;

  const primaryValue = data.attempt.overallBand != null ? data.attempt.overallBand : data.attempt.overallScore != null ? `${data.attempt.overallScore}%` : '—';
  const primaryLabel = data.attempt.overallBand != null ? 'Overall band' : 'Overall score';

  return (
    <>
      <section className="resultHero">
        <div className="resultHeroCopy">
          <span className="authEyebrow">FINAL MOCK RESULT</span>
          <h1>{data.mock.title}</h1>
          <p>{data.mock.track.toUpperCase()} · Completed {data.attempt.completedAt ? new Date(data.attempt.completedAt).toLocaleString() : ''}</p>
        </div>
        <div className="resultScoreCard">
          <span>{primaryLabel}</span>
          <strong>{primaryValue}</strong>
          <small>Completed successfully</small>
        </div>
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
              <div className="resultMainValue"><strong>{result?.band ?? score}</strong><span>{result?.band != null ? 'Band' : 'Score'}</span></div>
              <div className="resultStats">
                <div><span>Correct</span><b>{details.correct ?? '—'}</b></div>
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
        <div><span className="authEyebrow">NEXT STEP</span><h2>Natija saqlandi.</h2><p>Bot ulanganidan keyin aynan shu final natija studentga va active adminlarga avtomatik yuboriladi.</p></div>
        <div className="resultActions"><Link className="authPrimary" href="/dashboard">Dashboard <span>→</span></Link><Link className="authSecondary" href="/mock">Mock bo‘limi</Link></div>
      </section>
    </>
  );
}
