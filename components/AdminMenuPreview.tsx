'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileTextIcon, LayoutGridIcon } from '@/components/UiIcons';

type Track = 'ielts' | 'cefr';
type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

type TestRow = {
  id: string;
  title: string;
  description?: string;
  track: Track;
  skill: string;
  status: 'published' | 'draft';
  file_name?: string;
};

const skills: Array<{ key: Skill; label: string }> = [
  { key: 'listening', label: 'Listening' },
  { key: 'reading', label: 'Reading' },
  { key: 'writing', label: 'Writing' },
  { key: 'speaking', label: 'Speaking' },
];

export function AdminMenuPreview() {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<Track>('ielts');
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topbarHost, setTopbarHost] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setBodyHost(document.body);

    const attach = () => {
      const host = document.querySelector<HTMLElement>('.adminTopActions');
      if (host) setTopbarHost(host);
      return Boolean(host);
    };

    if (attach()) return;

    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function openMenu() {
    setOpen(true);
    if (tests.length || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Testlar yuklanmadi.');
      setTests(Array.isArray(body.tests) ? body.tests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testlar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }

  const trackTests = useMemo(
    () => tests.filter((test) => test.track === track),
    [tests, track],
  );

  const trigger = (
    <button className="adminMenuPreviewTrigger" type="button" onClick={openMenu}>
      <LayoutGridIcon />
      <span>Menyuni ko‘rish</span>
    </button>
  );

  const modal = open ? (
    <div className="adminMenuPreviewBackdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section className="adminMenuPreviewModal" role="dialog" aria-modal="true" aria-label="Test menyusi">
        <header className="adminMenuPreviewHead">
          <div>
            <small>ADMIN MENU PREVIEW</small>
            <h2>IELTS va CEFR test menyusi</h2>
            <p>Barcha bo‘limlarga qo‘shilgan testlarni shu yerdan ko‘ring. Bu oynadan o‘quvchi urinish boshlamaydi.</p>
          </div>
          <button type="button" aria-label="Yopish" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="adminMenuPreviewTracks" role="tablist" aria-label="Yo‘nalish">
          {(['ielts', 'cefr'] as Track[]).map((item) => {
            const count = tests.filter((test) => test.track === item).length;
            return (
              <button
                key={item}
                type="button"
                className={track === item ? 'active' : ''}
                onClick={() => setTrack(item)}
              >
                <span>{item.toUpperCase()}</span>
                <small>{count} ta test</small>
              </button>
            );
          })}
        </div>

        <div className="adminMenuPreviewBody">
          {loading ? (
            <div className="adminMenuPreviewState">Testlar yuklanmoqda…</div>
          ) : error ? (
            <div className="adminMenuPreviewState error">{error}</div>
          ) : (
            <div className="adminMenuPreviewSkills">
              {skills.map((skill) => {
                const rows = trackTests.filter((test) => test.skill === skill.key);
                return (
                  <article className="adminMenuPreviewSkill" key={`${track}-${skill.key}`}>
                    <div className="adminMenuPreviewSkillHead">
                      <div>
                        <small>{track.toUpperCase()}</small>
                        <h3>{skill.label}</h3>
                      </div>
                      <strong>{rows.length}</strong>
                    </div>

                    <div className="adminMenuPreviewTests">
                      {rows.length ? rows.map((test) => (
                        <div className="adminMenuPreviewTest" key={test.id}>
                          <span className="adminMenuPreviewFile"><FileTextIcon /></span>
                          <div>
                            <h4>{test.title}</h4>
                            <p>{test.file_name || test.description || 'HTML test'}</p>
                            <span className={test.status === 'published' ? 'published' : 'draft'}>
                              {test.status === 'published' ? 'Ochiq' : 'Yopiq'}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="adminMenuPreviewEmpty">Bu bo‘limga test qo‘shilmagan.</div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      {topbarHost ? createPortal(trigger, topbarHost) : null}
      {bodyHost && modal ? createPortal(modal, bodyHost) : null}
      <style>{`
        .adminMenuPreviewTrigger{height:39px;padding:0 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.06);color:#dae3ed;display:flex;align-items:center;gap:7px;font:800 8px/1 "Avenir Next","Segoe UI Variable","SF Pro Display","Helvetica Neue",Arial,sans-serif;cursor:pointer;transition:.18s ease;white-space:nowrap}.adminMenuPreviewTrigger:hover{background:rgba(255,255,255,.11)}.adminMenuPreviewTrigger svg{width:15px!important;height:15px!important}
        .adminMenuPreviewBackdrop{position:fixed;z-index:10000;inset:0;padding:28px;background:rgba(5,15,28,.66);backdrop-filter:blur(10px);display:grid;place-items:center}
        .adminMenuPreviewModal{width:min(1180px,100%);max-height:min(880px,calc(100vh - 56px));overflow:hidden;border:1px solid rgba(14,32,56,.12);border-radius:28px;background:#f8f2e8;color:#132842;box-shadow:0 34px 90px rgba(0,0,0,.28);display:grid;grid-template-rows:auto auto minmax(0,1fr);font-family:"Avenir Next","Segoe UI Variable","SF Pro Display","Helvetica Neue",Arial,sans-serif}
        .adminMenuPreviewHead{padding:24px 26px 20px;background:#10233f;color:#fff;display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.adminMenuPreviewHead small{color:#8195ad;font-size:7px;font-weight:850;letter-spacing:.14em}.adminMenuPreviewHead h2{margin:7px 0 7px;font-size:27px;letter-spacing:-.04em}.adminMenuPreviewHead p{max-width:650px;margin:0;color:#98a8ba;font-size:9px;line-height:1.55}.adminMenuPreviewHead>button{width:38px;height:38px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.07);color:#fff;font:300 24px/1 Arial;cursor:pointer}
        .adminMenuPreviewTracks{padding:12px 18px;border-bottom:1px solid rgba(14,32,56,.09);background:#fffdf8;display:flex;gap:8px}.adminMenuPreviewTracks button{min-width:150px;padding:10px 13px;border:1px solid rgba(14,32,56,.10);border-radius:13px;background:#f7f1e8;color:#536176;display:flex;align-items:center;justify-content:space-between;gap:16px;font:inherit;cursor:pointer}.adminMenuPreviewTracks button span{font-size:10px;font-weight:850;letter-spacing:.06em}.adminMenuPreviewTracks button small{font-size:7px;color:#8b949e}.adminMenuPreviewTracks button.active{background:#10233f;color:#fff;border-color:#10233f}.adminMenuPreviewTracks button.active small{color:#91a3b8}
        .adminMenuPreviewBody{overflow:auto;padding:18px}.adminMenuPreviewSkills{display:grid;grid-template-columns:1fr 1fr;gap:14px}.adminMenuPreviewSkill{min-height:230px;border:1px solid rgba(14,32,56,.10);border-radius:20px;background:#fffdf8;overflow:hidden}.adminMenuPreviewSkillHead{padding:15px 16px;border-bottom:1px solid rgba(14,32,56,.08);display:flex;align-items:center;justify-content:space-between}.adminMenuPreviewSkillHead small{color:#939ba4;font-size:6px;font-weight:850;letter-spacing:.13em}.adminMenuPreviewSkillHead h3{margin:4px 0 0;font-size:17px;letter-spacing:-.03em}.adminMenuPreviewSkillHead strong{min-width:31px;height:31px;padding:0 8px;border-radius:10px;background:#e8efee;color:#315d63;display:grid;place-items:center;font-size:10px}
        .adminMenuPreviewTests{padding:8px 12px 12px}.adminMenuPreviewTest{min-height:65px;padding:9px 4px;display:grid;grid-template-columns:39px minmax(0,1fr);align-items:center;gap:10px;border-bottom:1px solid rgba(14,32,56,.07)}.adminMenuPreviewTest:last-child{border-bottom:0}.adminMenuPreviewFile{width:38px;height:38px;padding:10px;border-radius:12px;background:#edf1f1;color:#315d63}.adminMenuPreviewFile svg{width:100%!important;height:100%!important}.adminMenuPreviewTest h4{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.adminMenuPreviewTest p{margin:3px 0 5px;color:#9199a3;font-size:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.adminMenuPreviewTest div>span{display:inline-block;padding:3px 6px;border-radius:999px;font-size:6px;font-weight:850}.adminMenuPreviewTest div>span.published{background:#e6f5ec;color:#24734f}.adminMenuPreviewTest div>span.draft{background:#fff1d9;color:#8a6724}.adminMenuPreviewEmpty,.adminMenuPreviewState{min-height:120px;display:grid;place-items:center;text-align:center;color:#8b949e;font-size:8px}.adminMenuPreviewState{min-height:310px}.adminMenuPreviewState.error{color:#b44137}
        @media(max-width:900px){.adminMenuPreviewBackdrop{padding:12px}.adminMenuPreviewModal{max-height:calc(100vh - 24px);border-radius:22px}.adminMenuPreviewSkills{grid-template-columns:1fr}}
        @media(max-width:620px){.adminMenuPreviewTrigger{width:39px;padding:0;justify-content:center}.adminMenuPreviewTrigger span{display:none}.adminMenuPreviewHead{padding:19px}.adminMenuPreviewHead h2{font-size:22px}.adminMenuPreviewTracks{padding:10px}.adminMenuPreviewTracks button{min-width:0;flex:1}.adminMenuPreviewBody{padding:10px}}
      `}</style>
    </>
  );
}
