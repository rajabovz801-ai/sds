'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, FileTextIcon } from '@/components/UiIcons';
import type { MockAttemptData } from '@/lib/mockAttempts';

const labels: Record<string, string> = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

export function MockAttemptClient({ id, initialData }: { id: string; initialData: MockAttemptData }) {
  const router = useRouter();
  const [data, setData] = useState<MockAttemptData | null>(initialData);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');

  const load = () => {
    setError('');
    return fetch(`/api/mock/attempts/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Mock attempt topilmadi.');
        setData(body);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Mock attempt topilmadi.');
        setData(null);
      });
  };

  const completed = useMemo(() => data?.sections.filter((item) => item.result).length || 0, [data]);
  const allDone = Boolean(data?.sections.length && completed === data.sections.length);

  const finishMock = async () => {
    if (!allDone || finishing) return;
    setFinishing(true);
    setFinishError('');
    try {
      const response = await fetch(`/api/mock/attempts/${id}/finish`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock yakunlanmadi.');
      router.replace(`/result/${id}`);
      router.refresh();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : 'Mock yakunlanmadi.');
      await load();
    } finally {
      setFinishing(false);
    }
  };

  if (!data) return <div className="mockAccessGate"><div className="mockGateIcon"><FileTextIcon /></div><h1>Mock session topilmadi</h1><p>{error}</p><Link className="authPrimary" href="/mock"><ArrowLeftIcon /> Mock bo‘limiga qaytish</Link></div>;

  return (
    <>
      <section className="pageHeading mockHeading">
        <div className="pageHeadingCopy">
          <span className="authEyebrow">ACTIVE MOCK SESSION</span>
          <h1>{data.mock.title}</h1>
          <p>{data.mock.track.toUpperCase()} · {completed}/{data.sections.length} section completed</p>
        </div>
        <div className="mockSessionStatus"><span className={data.attempt.status === 'completed' ? 'done' : ''} /><div><b>{data.attempt.status.replace('_', ' ')}</b><small>Started {new Date(data.attempt.startedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</small></div></div>
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
              const correct = item.result?.details?.correct;
              const wrong = item.result?.details?.wrong;
              return (
                <article className={`mockSectionCard ${item.result ? 'isComplete' : ''}`} key={item.section}>
                  <div className="mockSectionIndex">{String(index + 1).padStart(2, '0')}</div>
                  <div className="mockSectionInfo">
                    <span>{sectionLabel.toUpperCase()}</span>
                    <h3>{item.test?.title || `${sectionLabel} test`}</h3>
                    <p>{item.result ? `Saved${correct != null ? ` · ${correct} correct` : ''}${wrong != null ? ` · ${wrong} wrong` : ''}` : item.test ? 'Test mock session bilan bog‘langan.' : 'Test hali mock’ga biriktirilmagan.'}</p>
                  </div>
                  <div className="mockSectionAction">
                    {item.result ? (
                      <div className="mockResultMini"><b>{item.result.band ?? (item.result.raw_score != null ? `${item.result.raw_score}/${item.result.max_score ?? '—'}` : '✓')}</b><span>{item.result.band != null ? 'Band' : 'Score'}</span></div>
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
            <div><span>Overall</span><b>{data.attempt.overallBand ?? (data.attempt.overallScore != null ? `${data.attempt.overallScore}%` : '—')}</b></div>
          </div>
          <div className="mockProgressTrack"><span style={{ width: `${data.sections.length ? (completed / data.sections.length) * 100 : 0}%` }} /></div>

          {data.attempt.status === 'completed' ? (
            <Link className="authPrimary mockFinishButton" href={`/result/${id}`}>Final resultni ko‘rish <span><ArrowRightIcon /></span></Link>
          ) : (
            <button className="authPrimary mockFinishButton" type="button" disabled={!allDone || finishing} onClick={finishMock}>
              {finishing ? 'Yakunlanmoqda…' : 'Mockni yakunlash'}
            </button>
          )}

          {!allDone && data.attempt.status !== 'completed' && <p className="mockSummaryNote">Final submit barcha biriktirilgan section natijalari saqlangandan keyin ochiladi.</p>}
          {finishError && <p className="mockFinishError">{finishError}</p>}
          <Link className="authSecondary mockBackLink" href="/mock"><ArrowLeftIcon /> Yo‘nalishlarga qaytish</Link>
        </aside>
      </section>
    </>
  );
}
