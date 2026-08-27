'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileTextIcon, SearchIcon } from '@/components/UiIcons';
import styles from '@/components/AdminProfessionalLayer.module.css';

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  telegramId: string;
  username: string | null;
  status: string;
  joinedAt: string | null;
  testsCompleted: number;
  averageAccuracy: number | null;
  averageBand: number | null;
  violations: number;
  lastActivity: string | null;
};

type ResultRow = {
  id: string;
  studentId: string;
  testId: string;
  title: string;
  track: string;
  skill: string;
  mode: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  accuracy: number | null;
  band: number | null;
  correct: number | null;
  wrong: number | null;
  unanswered: number | null;
  durationSeconds: number | null;
  violations: number;
  deliverySent: boolean;
  startedAt: string;
  completedAt: string | null;
};

type Overview = {
  metrics: {
    students: number;
    activeStudents: number;
    blockedStudents: number;
    completedResults: number;
    averageAccuracy: number | null;
  };
  students: StudentRow[];
  results: ResultRow[];
  activity: Array<{ date: string; count: number }>;
  skills: Array<{ skill: string; attempts: number; average: number }>;
};

type Health = 'all' | 'completed' | 'in_progress' | 'missing' | 'expired' | 'other';
type DateRange = 'all' | 'today' | '7d' | '30d';

function resultHealth(result: ResultRow): Exclude<Health, 'all'> {
  if (result.status === 'completed') return 'completed';
  if (result.status === 'in_progress') return 'in_progress';
  if (result.status === 'expired' && result.score === null) return 'missing';
  if (result.status === 'expired') return 'expired';
  return 'other';
}

function healthLabel(health: Exclude<Health, 'all'>) {
  if (health === 'completed') return 'COMPLETED';
  if (health === 'in_progress') return 'IN PROGRESS';
  if (health === 'missing') return 'RESULT MISSING';
  if (health === 'expired') return 'EXPIRED';
  return 'OTHER';
}

function healthClass(health: Exclude<Health, 'all'>) {
  if (health === 'completed') return styles.completed;
  if (health === 'in_progress') return styles.inProgress;
  if (health === 'missing') return styles.missing;
  if (health === 'expired') return styles.expired;
  return styles.other;
}

function formatDate(value?: string | null, withTime = true) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('uz-UZ', withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (value === null) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function sameLocalDay(value: string, date = new Date()) {
  const item = new Date(value);
  return item.getFullYear() === date.getFullYear()
    && item.getMonth() === date.getMonth()
    && item.getDate() === date.getDate();
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function AdminProfessionalLayer() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ResultRow | null>(null);
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState('all');
  const [skill, setSkill] = useState('all');
  const [health, setHealth] = useState<Health>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [testTrack, setTestTrack] = useState('all');
  const [testSkill, setTestSkill] = useState('all');
  const [testStatus, setTestStatus] = useState('all');
  const [visibleTestCount, setVisibleTestCount] = useState(0);
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [overviewMount, setOverviewMount] = useState<HTMLElement | null>(null);
  const [testFilterMount, setTestFilterMount] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Natijalar yuklanmadi.');
      setOverview(body as Overview);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Natijalar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    setBodyHost(document.body);
    const root = document.querySelector('.adminRoot') || document.body;

    const sync = () => {
      const nextNav = document.querySelector<HTMLElement>('.adminNav');
      if (nextNav) setNavHost(nextNav);

      const overviewHost = document.querySelector<HTMLElement>('.adminOverview');
      if (overviewHost) {
        let mount = overviewHost.querySelector<HTMLElement>('#admin-professional-overview');
        if (!mount) {
          mount = document.createElement('div');
          mount.id = 'admin-professional-overview';
          overviewHost.prepend(mount);
        }
        setOverviewMount(mount);
      } else {
        setOverviewMount(null);
      }

      const library = document.querySelector<HTMLElement>('.adminLibrary');
      const libraryHeader = library?.querySelector<HTMLElement>('.adminLibraryHeader');
      if (library && libraryHeader) {
        let mount = library.querySelector<HTMLElement>('#admin-professional-test-filters');
        if (!mount) {
          mount = document.createElement('div');
          mount.id = 'admin-professional-test-filters';
          libraryHeader.insertAdjacentElement('afterend', mount);
        }
        setTestFilterMount(mount);
      } else {
        setTestFilterMount(null);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById('admin-professional-overview')?.remove();
      document.getElementById('admin-professional-test-filters')?.remove();
    };
  }, []);

  useEffect(() => {
    if (!navHost) return;
    const closeOnAdminNavigation = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button');
      if (button && !button.hasAttribute('data-prof-results')) setResultsOpen(false);
    };
    navHost.addEventListener('click', closeOnAdminNavigation);
    return () => navHost.removeEventListener('click', closeOnAdminNavigation);
  }, [navHost]);

  useEffect(() => {
    const apply = () => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('.adminTestRow'));
      let visible = 0;
      rows.forEach((row) => {
        const text = (row.textContent || '').toLowerCase();
        const matchesTrack = testTrack === 'all' || text.includes(`${testTrack.toLowerCase()} ·`);
        const matchesSkill = testSkill === 'all' || text.includes(`· ${testSkill.toLowerCase()} ·`);
        const matchesStatus = testStatus === 'all'
          || (testStatus === 'published' ? text.includes('open') : text.includes('closed'));
        const show = matchesTrack && matchesSkill && matchesStatus;
        row.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      setVisibleTestCount(visible);
    };

    apply();
    const list = document.querySelector('.adminTestList');
    if (!list) return;
    const observer = new MutationObserver(apply);
    observer.observe(list, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>('.adminTestRow').forEach((row) => { row.style.display = ''; });
    };
  }, [testTrack, testSkill, testStatus, testFilterMount]);

  useEffect(() => {
    if (!resultsOpen) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [resultsOpen]);

  const studentMap = useMemo(() => new Map((overview?.students || []).map((student) => [student.id, student])), [overview]);
  const results = overview?.results || [];

  const counts = useMemo(() => {
    const todayCompleted = results.filter((result) => result.status === 'completed' && sameLocalDay(result.completedAt || result.startedAt)).length;
    return {
      completed: results.filter((result) => resultHealth(result) === 'completed').length,
      live: results.filter((result) => resultHealth(result) === 'in_progress').length,
      missing: results.filter((result) => resultHealth(result) === 'missing').length,
      expired: results.filter((result) => resultHealth(result) === 'expired').length,
      todayCompleted,
    };
  }, [results]);

  const liveResults = useMemo(() => results.filter((result) => resultHealth(result) === 'in_progress').slice(0, 5), [results]);

  const filteredResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = Date.now();
    return results.filter((result) => {
      const student = studentMap.get(result.studentId);
      const haystack = `${student?.firstName || ''} ${student?.lastName || ''} ${student?.telegramId || ''} ${result.title} ${result.track} ${result.skill}`.toLowerCase();
      if (normalized && !haystack.includes(normalized)) return false;
      if (track !== 'all' && result.track !== track) return false;
      if (skill !== 'all' && result.skill !== skill) return false;
      if (health !== 'all' && resultHealth(result) !== health) return false;

      const stamp = new Date(result.completedAt || result.startedAt).getTime();
      if (!Number.isFinite(stamp)) return dateRange === 'all';
      if (dateRange === 'today') return sameLocalDay(result.completedAt || result.startedAt);
      if (dateRange === '7d' && stamp < now - 7 * 86400000) return false;
      if (dateRange === '30d' && stamp < now - 30 * 86400000) return false;
      return true;
    });
  }, [results, studentMap, query, track, skill, health, dateRange]);

  function openResults(nextHealth: Health = 'all') {
    setHealth(nextHealth);
    setResultsOpen(true);
    setSelectedResult(null);
    void loadOverview();
  }

  function exportCsv() {
    const headers = ['Student', 'Telegram ID', 'Test', 'Track', 'Skill', 'Status', 'Score', 'Max score', 'Accuracy', 'Band', 'Correct', 'Wrong', 'Empty', 'Duration', 'Warnings', 'Telegram sent', 'Started', 'Completed'];
    const rows = filteredResults.map((result) => {
      const student = studentMap.get(result.studentId);
      return [
        `${student?.firstName || ''} ${student?.lastName || ''}`.trim(),
        student?.telegramId || '',
        result.title,
        result.track,
        result.skill,
        healthLabel(resultHealth(result)),
        result.score ?? '',
        result.maxScore ?? '',
        result.accuracy ?? '',
        result.band ?? '',
        result.correct ?? '',
        result.wrong ?? '',
        result.unanswered ?? '',
        formatDuration(result.durationSeconds),
        result.violations,
        result.deliverySent ? 'YES' : 'NO',
        result.startedAt,
        result.completedAt || '',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ark-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const navButton = navHost ? createPortal(
    <button type="button" data-prof-results="1" className={`${styles.navButton} ${resultsOpen ? 'active' : ''}`} onClick={() => openResults('all')}>
      <FileTextIcon /> Natijalar
    </button>,
    navHost,
  ) : null;

  const overviewPortal = overviewMount ? createPortal(
    <div className={styles.overviewMount}>
      <div className={styles.opsShell}>
        <div className={styles.opsCards}>
          <button className={styles.opsCard} type="button" onClick={() => openResults('in_progress')}><small>LIVE SESSIONS</small><strong>{counts.live}</strong><span>hozir ishlayapti</span></button>
          <button className={styles.opsCard} type="button" onClick={() => openResults('missing')}><small>RESULT MISSING</small><strong>{counts.missing}</strong><span>natija kelmagan</span></button>
          <button className={styles.opsCard} type="button" onClick={() => openResults('expired')}><small>EXPIRED</small><strong>{counts.expired}</strong><span>yakunlanmagan</span></button>
          <button className={styles.opsCard} type="button" onClick={() => { setDateRange('today'); openResults('completed'); }}><small>BUGUN</small><strong>{counts.todayCompleted}</strong><span>yakunlangan test</span></button>
        </div>
        <article className={styles.liveCard}>
          <div className={styles.liveCardHead}><div><small>REAL-TIME MONITOR</small><h3>Faol sessiyalar</h3></div><span className={styles.livePulse} /></div>
          <div className={styles.liveRows}>
            {liveResults.length ? liveResults.map((result) => {
              const student = studentMap.get(result.studentId);
              return <div className={styles.liveRow} key={result.id}><span className={styles.liveAvatar}>{student?.firstName?.[0] || 'S'}</span><div><b>{student ? `${student.firstName} ${student.lastName}` : 'Student'}</b><small>{result.title}</small></div><span>LIVE</span></div>;
            }) : <div className={styles.liveEmpty}>Hozir faol test sessiyasi yo‘q.</div>}
          </div>
        </article>
      </div>
    </div>,
    overviewMount,
  ) : null;

  const testFiltersPortal = testFilterMount ? createPortal(
    <div className={styles.testFilterMount}>
      <div className={styles.testFilterBar}>
        <select value={testTrack} onChange={(event) => setTestTrack(event.target.value)} aria-label="Test yo‘nalishi"><option value="all">Barcha yo‘nalish</option><option value="ielts">IELTS</option><option value="cefr">CEFR</option></select>
        <select value={testSkill} onChange={(event) => setTestSkill(event.target.value)} aria-label="Test skilli"><option value="all">Barcha skill</option><option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option><option value="full-mock">Full mock</option></select>
        <select value={testStatus} onChange={(event) => setTestStatus(event.target.value)} aria-label="Test statusi"><option value="all">Barcha holat</option><option value="published">Ochiq</option><option value="draft">Yopiq</option></select>
        <strong>{visibleTestCount} ta test ko‘rinmoqda</strong>
      </div>
    </div>,
    testFilterMount,
  ) : null;

  const resultsPortal = resultsOpen && bodyHost ? createPortal(
    <section className={styles.resultsOverlay} aria-label="Admin natijalar boshqaruvi">
      <div className={styles.resultsInner}>
        <div className={styles.resultsTop}>
          <div><small>RESULT OPERATIONS</small><h2>Natijalar markazi</h2><p>Score, status, skill, vaqt va delivery holatini bitta joydan nazorat qiling.</p></div>
          <div className={styles.resultsActions}><button className={styles.actionButton} type="button" onClick={() => void loadOverview()}>Yangilash</button><button className={styles.actionButton} type="button" onClick={exportCsv}>CSV yuklash</button><button className={styles.actionButton} type="button" onClick={() => setResultsOpen(false)}>Admin panelga qaytish</button></div>
        </div>

        <div className={styles.resultsMetrics}>
          <div className={styles.metric}><small>YAKUNLANGAN</small><strong>{counts.completed}</strong><span>saqlangan natija</span></div>
          <div className={styles.metric}><small>LIVE</small><strong>{counts.live}</strong><span>in progress</span></div>
          <div className={styles.metric}><small>RESULT MISSING</small><strong>{counts.missing}</strong><span>score kelmagan</span></div>
          <div className={styles.metric}><small>EXPIRED</small><strong>{counts.expired}</strong><span>expired session</span></div>
          <div className={styles.metric}><small>BUGUN</small><strong>{counts.todayCompleted}</strong><span>completed</span></div>
        </div>

        <div className={styles.filters}>
          <div style={{ position: 'relative' }}><SearchIcon /><input style={{ width: '100%', paddingLeft: 32 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Student, test yoki Telegram ID…" /></div>
          <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)}><option value="today">Bugun</option><option value="7d">7 kun</option><option value="30d">30 kun</option><option value="all">Barcha vaqt</option></select>
          <select value={track} onChange={(event) => setTrack(event.target.value)}><option value="all">IELTS + CEFR</option><option value="ielts">IELTS</option><option value="cefr">CEFR</option></select>
          <select value={skill} onChange={(event) => setSkill(event.target.value)}><option value="all">Barcha skill</option><option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option><option value="full-mock">Full mock</option></select>
          <select value={health} onChange={(event) => setHealth(event.target.value as Health)}><option value="all">Barcha status</option><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="missing">Result missing</option><option value="expired">Expired</option><option value="other">Other</option></select>
        </div>

        <div className={styles.tableShell}>
          {loading ? <div className={styles.empty}>Natijalar yangilanmoqda…</div> : error ? <div className={styles.empty}>{error}</div> : filteredResults.length ? (
            <table className={styles.table}>
              <thead><tr><th>O‘QUVCHI</th><th>TEST</th><th>YO‘NALISH</th><th>STATUS</th><th>SCORE</th><th>ACCURACY</th><th>BAND</th><th>TIME</th><th>SANA</th></tr></thead>
              <tbody>{filteredResults.map((result) => {
                const student = studentMap.get(result.studentId);
                const state = resultHealth(result);
                return <tr key={result.id} onClick={() => setSelectedResult(result)}>
                  <td><div className={styles.studentCell}><span>{student?.firstName?.[0] || 'S'}{student?.lastName?.[0] || ''}</span><div><b>{student ? `${student.firstName} ${student.lastName}` : 'Student'}</b><small>{student?.telegramId || result.studentId.slice(0, 8)}</small></div></div></td>
                  <td><div className={styles.testCell}><b>{result.title}</b><small>{result.mode}</small></div></td>
                  <td><b>{(result.track || '—').toUpperCase()}</b><div className={styles.muted}>{(result.skill || '—').toUpperCase()}</div></td>
                  <td><span className={`${styles.status} ${healthClass(state)}`}>{healthLabel(state)}</span></td>
                  <td className={styles.score}>{result.score != null ? `${result.score}/${result.maxScore ?? '—'}` : '—'}</td>
                  <td>{result.accuracy != null ? `${result.accuracy}%` : '—'}</td>
                  <td>{result.band ?? '—'}</td>
                  <td>{formatDuration(result.durationSeconds)}</td>
                  <td>{formatDate(result.completedAt || result.startedAt)}</td>
                </tr>;
              })}</tbody>
            </table>
          ) : <div className={styles.empty}>Tanlangan filter bo‘yicha natija topilmadi.</div>}
        </div>
      </div>

      {selectedResult && (() => {
        const student = studentMap.get(selectedResult.studentId);
        const state = resultHealth(selectedResult);
        return <div className={styles.drawerBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedResult(null); }}>
          <aside className={styles.drawer}>
            <div className={styles.drawerHead}><div><small>RESULT DETAIL</small><h3>{selectedResult.title}</h3><p>{student ? `${student.firstName} ${student.lastName}` : 'Student'} · {(selectedResult.track || '—').toUpperCase()} · {(selectedResult.skill || '—').toUpperCase()}</p></div><button className={styles.close} type="button" onClick={() => setSelectedResult(null)}>×</button></div>
            <div className={styles.drawerBody}>
              <div className={styles.drawerStatus}><span className={`${styles.status} ${healthClass(state)}`}>{healthLabel(state)}</span><span className={styles.muted}>{selectedResult.mode}</span></div>
              <div className={styles.drawerGrid}>
                <div className={styles.detailCard}><small>SCORE</small><strong>{selectedResult.score != null ? `${selectedResult.score}/${selectedResult.maxScore ?? '—'}` : '—'}</strong><span>raw score</span></div>
                <div className={styles.detailCard}><small>ACCURACY</small><strong>{selectedResult.accuracy != null ? `${selectedResult.accuracy}%` : '—'}</strong><span>percentage</span></div>
                <div className={styles.detailCard}><small>BAND</small><strong>{selectedResult.band ?? '—'}</strong><span>IELTS band</span></div>
                <div className={styles.detailCard}><small>DURATION</small><strong>{formatDuration(selectedResult.durationSeconds)}</strong><span>test time</span></div>
                <div className={styles.detailCard}><small>CORRECT</small><strong>{selectedResult.correct ?? '—'}</strong><span>correct answers</span></div>
                <div className={styles.detailCard}><small>WRONG</small><strong>{selectedResult.wrong ?? '—'}</strong><span>wrong answers</span></div>
                <div className={styles.detailCard}><small>EMPTY</small><strong>{selectedResult.unanswered ?? '—'}</strong><span>unanswered</span></div>
                <div className={styles.detailCard}><small>WARNING</small><strong>{selectedResult.violations}</strong><span>violations</span></div>
              </div>
              <div className={styles.drawerTimeline}>
                <div className={styles.timelineRow}><small>Telegram delivery</small><b>{selectedResult.deliverySent ? 'Yuborilgan' : 'Yuborilmagan'}</b></div>
                <div className={styles.timelineRow}><small>Boshlangan</small><b>{formatDate(selectedResult.startedAt)}</b></div>
                <div className={styles.timelineRow}><small>Yakunlangan</small><b>{formatDate(selectedResult.completedAt)}</b></div>
                <div className={styles.timelineRow}><small>Student ID</small><b>{student?.telegramId || selectedResult.studentId}</b></div>
              </div>
            </div>
          </aside>
        </div>;
      })()}
    </section>,
    bodyHost,
  ) : null;

  return <>{navButton}{overviewPortal}{testFiltersPortal}{resultsPortal}</>;
}
