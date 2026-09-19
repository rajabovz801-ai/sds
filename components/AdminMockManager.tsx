'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheckIcon, UploadCloudIcon, UserIcon } from '@/components/UiIcons';
import { supabase } from '@/lib/supabase/client';
import styles from './AdminMockManager.module.css';

type UploadKind = 'listeningHtml' | 'readingHtml' | 'listeningVideo' | 'readingVideo';
type FileState = Record<UploadKind, File | null>;

const emptyFiles: FileState = { listeningHtml: null, readingHtml: null, listeningVideo: null, readingVideo: null };

export function AdminMockManager() {
  const [open, setOpen] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [tab, setTab] = useState<'results' | 'setup'>('results');
  const [data, setData] = useState<any>({ mocks: [], tests: [], codes: [], attempts: [], results: [], students: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [title, setTitle] = useState('IELTS FULL MOCK 01');
  const [prefix, setPrefix] = useState('ARK-M01');
  const [files, setFiles] = useState<FileState>(emptyFiles);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/mocks', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock ma’lumotlari yuklanmadi.');
      setData(body);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mock ma’lumotlari yuklanmadi.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPortalHost(document.body); }, []);
  useEffect(() => { if (open) void load(); }, [load, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const studentById = useMemo(() => new Map((data.students || []).map((row: any) => [row.id, row])), [data.students]);

  async function upload(kind: UploadKind, file: File) {
    setMessage(`${file.name} yuklanmoqda…`);
    const response = await fetch('/api/admin/mocks/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, name: file.name, type: file.type, size: file.size }),
    });
    const signed = await response.json();
    if (!response.ok) throw new Error(signed.error || `${file.name} uchun upload URL yaratilmadi.`);

    const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(
      signed.path,
      signed.token,
      file,
      { contentType: file.type || (kind.endsWith('Html') ? 'text/html' : 'video/mp4') },
    );
    if (error) throw error;
    return { bucket: signed.bucket, path: signed.path, name: file.name, size: file.size };
  }

  async function createMock() {
    if (busy) return;
    const missing = (Object.keys(files) as UploadKind[]).filter((key) => !files[key]);
    if (missing.length) {
      setMessage('Listening/Reading HTML va ikkala instruction video ham majburiy.');
      setIsError(true);
      return;
    }

    setBusy(true);
    setIsError(false);
    try {
      const uploaded: Partial<Record<UploadKind, any>> = {};
      for (const kind of ['listeningHtml', 'readingHtml', 'listeningVideo', 'readingVideo'] as UploadKind[]) {
        uploaded[kind] = await upload(kind, files[kind]!);
      }

      setMessage('Mock profili, Candidate ID va Mock Code lar yaratilmoqda…');
      const response = await fetch('/api/admin/mocks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, candidatePrefix: prefix, ...uploaded }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock yaratilmadi.');

      setMessage(`${body.candidates} ta Candidate ID va Mock Code tayyorlandi. Mock DRAFT holatda — kodlar shu panelda saqlanadi.`);
      setIsError(false);
      setFiles(emptyFiles);
      setTab('results');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mock yaratilmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function updateMock(id: string, action: 'publish' | 'close') {
    if (busy) return;
    setBusy(true);
    setIsError(false);
    try {
      const response = await fetch(`/api/admin/mocks/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock holati o‘zgarmadi.');
      setMessage(action === 'publish'
        ? 'Mock ochildi. Dashboard banner, Candidate ID va kirish kodlari faol.'
        : 'Mock yopildi. Yangi kirishlar to‘xtatildi, eski natijalar va kodlar saqlanadi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mock holati o‘zgarmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  function candidateRows(mockId: string) {
    const codes = (data.codes || []).filter((row: any) => row.mock_id === mockId);
    const attempts = (data.attempts || []).filter((row: any) => row.mock_id === mockId);
    return codes.map((code: any) => {
      const student: any = studentById.get(code.student_id);
      const attempt = attempts.find((row: any) => row.student_id === code.student_id) || null;
      const sectionResults = attempt ? (data.results || []).filter((row: any) => row.attempt_id === attempt.id) : [];
      const listening = sectionResults.find((row: any) => row.section === 'listening');
      const reading = sectionResults.find((row: any) => row.section === 'reading');
      return { code, student, attempt, listening, reading };
    });
  }

  async function copyCodes(mockId: string) {
    const rows = candidateRows(mockId);
    const lines = rows.map(({ code, student }: any) => {
      const name = student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Unknown';
      return `${code.candidate_id || '—'} | ${name} | ${code.code_plain || '—'}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setMessage(`${rows.length} ta Candidate ID va Mock Code clipboardga nusxalandi.`);
      setIsError(false);
    } catch {
      setMessage('Kodlarni avtomatik nusxalab bo‘lmadi. Jadvaldan ko‘chirishingiz mumkin.');
      setIsError(true);
    }
  }

  return (
    <>
      <button className={styles.launcher} type="button" onClick={() => setOpen(true)}>
        <ShieldCheckIcon />
        <span>FULL MOCK CONTROL</span>
      </button>

      {open && portalHost && createPortal(
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Full Mock Control">
            <div className={styles.head}>
              <div>
                <small>ARK ADMIN · SECURE EXAM MODULE</small>
                <h2>Full Mock Control</h2>
                <p>Listening → Reading flow, instruction videolar, Candidate ID, Mock Code va yakuniy natijalar.</p>
              </div>
              <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="Yopish">×</button>
            </div>

            <div className={styles.tabs}>
              <button className={tab === 'results' ? styles.active : ''} onClick={() => setTab('results')}>
                <UserIcon /> CANDIDATES & RESULTS
              </button>
              <button className={tab === 'setup' ? styles.active : ''} onClick={() => setTab('setup')}>
                <UploadCloudIcon /> PREPARE MOCK
              </button>
              <button className={styles.reload} onClick={() => void load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
            </div>

            <div className={styles.body}>
              {message && <div className={`${styles.status} ${isError ? styles.error : ''}`}>{message}</div>}

              {tab === 'setup' ? (
                <section className={styles.panel}>
                  <div className={styles.setupHeading}>
                    <div><small>STEP 01</small><h3>Yangi Full Mock tayyorlash</h3></div>
                    <span>DRAFT FIRST</span>
                  </div>

                  <div className={styles.form}>
                    <div className={styles.two}>
                      <div className={styles.field}>
                        <label>Mock title</label>
                        <input value={title} onChange={(event) => setTitle(event.target.value)} />
                      </div>
                      <div className={styles.field}>
                        <label>Candidate prefix</label>
                        <input value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} />
                      </div>
                    </div>

                    <div className={styles.fileGrid}>
                      <div className={styles.file}>
                        <label>Listening HTML</label>
                        <input type="file" accept=".html,.htm,text/html" onChange={(event) => setFiles((value) => ({ ...value, listeningHtml: event.target.files?.[0] || null }))} />
                        <small>{files.listeningHtml?.name || '40-question Listening test · HTML'}</small>
                      </div>
                      <div className={styles.file}>
                        <label>Reading HTML</label>
                        <input type="file" accept=".html,.htm,text/html" onChange={(event) => setFiles((value) => ({ ...value, readingHtml: event.target.files?.[0] || null }))} />
                        <small>{files.readingHtml?.name || '40-question Reading test · HTML'}</small>
                      </div>
                      <div className={styles.file}>
                        <label>Listening instruction video</label>
                        <input type="file" accept="video/mp4,.mp4" onChange={(event) => setFiles((value) => ({ ...value, listeningVideo: event.target.files?.[0] || null }))} />
                        <small>{files.listeningVideo?.name || 'MP4 · max 50 MB'}</small>
                      </div>
                      <div className={styles.file}>
                        <label>Reading instruction video</label>
                        <input type="file" accept="video/mp4,.mp4" onChange={(event) => setFiles((value) => ({ ...value, readingVideo: event.target.files?.[0] || null }))} />
                        <small>{files.readingVideo?.name || 'MP4 · max 50 MB'}</small>
                      </div>
                    </div>

                    <div className={styles.flowNote}>
                      <b>Student flow:</b> Mock Code → Listening video → Listening → Reading video → Reading → Final result.
                    </div>

                    <button className={styles.primary} type="button" disabled={busy} onClick={() => void createMock()}>
                      {busy ? 'Preparing Mock…' : 'Prepare Mock safely'}
                    </button>
                  </div>
                </section>
              ) : (
                <div className={styles.mockList}>
                  {(data.mocks || []).length === 0 && (
                    <div className={styles.panel}><div className={styles.empty}>Hali Full Mock yaratilmagan. “Prepare Mock” orqali boshlang.</div></div>
                  )}

                  {(data.mocks || []).map((mock: any) => {
                    const rows = candidateRows(mock.id);
                    const completed = rows.filter((row: any) => row.attempt?.status === 'completed').length;
                    const inProgress = rows.filter((row: any) => row.attempt?.status === 'in_progress').length;
                    return (
                      <section className={styles.mockCard} key={mock.id}>
                        <div className={styles.mockTop}>
                          <div>
                            <small>{mock.candidate_prefix || 'ARK-MOCK'} · {mock.track?.toUpperCase()}</small>
                            <h3>{mock.title}</h3>
                          </div>
                          <span className={`${styles.pill} ${mock.status === 'published' ? styles.live : ''}`}>{mock.status}</span>
                        </div>

                        <div className={styles.mockStats}>
                          <div><span>Candidates</span><b>{rows.length}</b></div>
                          <div><span>In progress</span><b>{inProgress}</b></div>
                          <div><span>Completed</span><b>{completed}</b></div>
                          <div><span>Dashboard</span><b>{mock.dashboard_enabled ? 'LIVE' : 'OFF'}</b></div>
                        </div>

                        <div className={styles.actions}>
                          <button className={styles.secondary} disabled={!rows.length} onClick={() => void copyCodes(mock.id)}>Copy codes</button>
                          {mock.status !== 'published'
                            ? <button className={styles.primary} disabled={busy} onClick={() => void updateMock(mock.id, 'publish')}>Open Mock</button>
                            : <button className={styles.danger} disabled={busy} onClick={() => void updateMock(mock.id, 'close')}>Close Mock</button>}
                        </div>

                        <div className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Candidate</th><th>Name</th><th>Mock Code</th><th>Status</th><th>Listening</th><th>Reading</th><th>Overall</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(({ code, student, attempt, listening, reading }: any) => (
                                <tr key={code.id}>
                                  <td>{code.candidate_id || '—'}</td>
                                  <td>{student ? `${student.first_name} ${student.last_name || ''}` : 'Unknown'}</td>
                                  <td className={styles.code}>{code.code_plain || '—'}</td>
                                  <td>{attempt?.status || (code.used_at ? 'used' : 'not started')}</td>
                                  <td>{listening ? `${listening.raw_score ?? '—'}/${listening.max_score ?? 40} · ${listening.band ?? '—'}` : '—'}</td>
                                  <td>{reading ? `${reading.raw_score ?? '—'}/${reading.max_score ?? 40} · ${reading.band ?? '—'}` : '—'}</td>
                                  <td>{attempt?.overall_band ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>,
        portalHost,
      )}
    </>
  );
}
