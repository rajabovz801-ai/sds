'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Section = {
  section: string;
  test: { id: string; title: string; skill: string; file_name: string } | null;
  result: { raw_score: number | null; max_score: number | null; band: number | null } | null;
};

type AttemptData = {
  attempt: { id: string; status: string; startedAt: string; completedAt: string | null; overallScore: number | null; overallBand: number | null };
  mock: { id: string; title: string; track: string; status: string };
  sections: Section[];
};

const labels: Record<string, string> = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

export function MockAttemptClient({ id }: { id: string }) {
  const [data, setData] = useState<AttemptData | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/mock/attempts/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Mock attempt topilmadi.');
        setData(body);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Mock attempt topilmadi.');
        setData(null);
      });
  }, [id]);

  const completed = useMemo(() => data?.sections.filter((item) => item.result).length || 0, [data]);

  if (data === undefined) return <div className="mockLoading">Mock session yuklanmoqda…</div>;
  if (!data) return <div className="mockAccessGate"><div className="mockGateIcon">!</div><h1>Mock session topilmadi</h1><p>{error}</p><Link className="authPrimary" href="/mock">Mock bo‘limiga qaytish</Link></div>;

  return (
    <>
      <section className="pageHeading mockHeading">
        <div className="pageHeadingCopy">
          <span className="authEyebrow">ACTIVE MOCK SESSION</span>
          <h1>{data.mock.title}</h1>
          <p>{data.mock.track.toUpperCase()} · {completed}/{data.sections.length} section completed</p>
        </div>
        <div className="mockSessionStatus"><span className={data.attempt.status === 'completed' ? 'done' : ''} /><div><b>{data.attempt.status.replace('_', ' ')}</b><small>Started {new Date(data.attempt.startedAt).toLocaleString()}</small></div></div>
      </section>

      <section className="mockSessionGrid">
        <div className="mockSessionMain">
          <div className="mockCardHeader">
            <div><span className="authEyebrow">SECTIONS</span><h2>Mock flow</h2></div>
            <span className="mockSecureBadge">{completed}/{data.sections.length} DONE</span>
          </div>

          <div className="mockSectionList">
            {data.sections.map((item, index) => {
              const sectionLabel = labels[item.section] || item.section;
              return (
                <article className="mockSectionCard" key={item.section}>
                  <div className="mockSectionIndex">{String(index + 1).padStart(2, '0')}</div>
                  <div className="mockSectionInfo">
                    <span>{sectionLabel.toUpperCase()}</span>
                    <h3>{item.test?.title || `${sectionLabel} test`}</h3>
                    <p>{item.result ? 'Section yakunlangan va natija saqlangan.' : item.test ? 'Test mock session bilan bog‘langan.' : 'Test hali mock’ga biriktirilmagan.'}</p>
                  </div>
                  <div className="mockSectionAction">
                    {item.result ? (
                      <div className="mockResultMini"><b>{item.result.band ?? item.result.raw_score ?? '✓'}</b><span>{item.result.band != null ? 'Band' : 'Score'}</span></div>
                    ) : item.test ? (
                      <Link className="pButton pButtonPrimary" href={`/test/${item.test.id}?attempt=${data.attempt.id}&mode=mock&section=${item.section}`}>Start {sectionLabel}</Link>
                    ) : (
                      <span className="mockUnavailable">Unavailable</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="mockSummaryCard">
          <span className="authEyebrow">MOCK SUMMARY</span>
          <h2>Session overview</h2>
          <div className="mockSummaryRows">
            <div><span>Status</span><b>{data.attempt.status.replace('_', ' ')}</b></div>
            <div><span>Completed</span><b>{completed}/{data.sections.length}</b></div>
            <div><span>Overall</span><b>{data.attempt.overallBand ?? data.attempt.overallScore ?? '—'}</b></div>
          </div>
          <div className="mockProgressTrack"><span style={{ width: `${data.sections.length ? (completed / data.sections.length) * 100 : 0}%` }} /></div>
          <p className="mockSummaryNote">Reading va Listening testlaridan natija kelgach, final result shu session ichida hisoblanadi va keyingi bosqichda Telegram botga ham yuboriladi.</p>
          <Link className="authSecondary mockBackLink" href="/mock">← Mock access</Link>
        </aside>
      </section>
    </>
  );
}
