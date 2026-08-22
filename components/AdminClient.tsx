'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  ArrowUpRightIcon,
  EditIcon,
  FileTextIcon,
  LayoutGridIcon,
  LibraryIcon,
  LogOutIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadCloudIcon,
  UserIcon,
} from '@/components/UiIcons';

type Track = 'ielts' | 'cefr';
type Skill = 'reading' | 'listening' | 'writing' | 'speaking' | 'full-mock';
type Status = 'published' | 'draft';
type AdminTab = 'overview' | 'tests' | 'students';

type TestRow = {
  id: string;
  title: string;
  description: string;
  track: Track;
  skill: Skill;
  status: Status;
  duration_minutes?: number;
  file_name: string;
  file_path: string;
  updated_at: string;
};

type FormState = {
  title: string;
  description: string;
  track: Track;
  skill: Skill;
  status: Status;
  durationMinutes: number;
};

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

const blank: FormState = {
  title: '',
  description: '',
  track: 'ielts',
  skill: 'reading',
  status: 'published',
  durationMinutes: 60,
};

function formatDate(value?: string | null, withTime = false) {
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

export function AdminClient() {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [tests, setTests] = useState<TestRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [testsResponse, overviewResponse] = await Promise.all([
        fetch('/api/admin/tests', { cache: 'no-store' }),
        fetch('/api/admin/overview', { cache: 'no-store' }),
      ]);
      if (testsResponse.status === 401 || overviewResponse.status === 401) {
        router.replace('/login');
        return;
      }

      const testsBody = await testsResponse.json();
      const overviewBody = await overviewResponse.json();
      if (!testsResponse.ok) throw new Error(testsBody.error || 'Testlar yuklanmadi.');
      setTests(testsBody.tests || []);
      if (overviewResponse.ok) {
        setOverview(overviewBody as Overview);
        setAnalyticsError('');
      } else {
        setOverview(null);
        setAnalyticsError(overviewBody.error || 'Statistika yuklanmadi.');
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin ma’lumotlari yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const testStats = useMemo(() => ({
    all: tests.length,
    published: tests.filter((test) => test.status === 'published').length,
    draft: tests.filter((test) => test.status === 'draft').length,
  }), [tests]);

  const filteredTests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tests;
    return tests.filter((test) => `${test.title} ${test.track} ${test.skill} ${test.status}`.toLowerCase().includes(normalized));
  }, [query, tests]);

  const filteredStudents = useMemo(() => {
    const normalized = studentQuery.trim().toLowerCase();
    const rows = overview?.students || [];
    if (!normalized) return rows;
    return rows.filter((student) => `${student.firstName} ${student.lastName} ${student.username || ''} ${student.telegramId}`.toLowerCase().includes(normalized));
  }, [overview, studentQuery]);

  const selectedStudent = overview?.students.find((student) => student.id === selectedStudentId) || filteredStudents[0] || null;
  const selectedResults = selectedStudent
    ? (overview?.results || []).filter((result) => result.studentId === selectedStudent.id)
    : [];
  const selectedTrend = selectedResults
    .filter((result) => result.status === 'completed' && result.accuracy !== null)
    .slice(0, 8)
    .reverse();

  const maxActivity = Math.max(1, ...(overview?.activity || []).map((item) => item.count));

  function reset() {
    setForm(blank);
    setFile(null);
    setEditId(null);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) { setError('Test nomini kiriting.'); return; }
    if (!editId && !file) { setError('HTML faylni tanlang.'); return; }
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)));
      if (file) formData.append('file', file);
      const response = editId
        ? await fetch(`/api/admin/tests/${editId}`, { method: 'PATCH', body: formData })
        : await fetch('/api/admin/tests', { method: 'POST', body: formData });

      if (response.status === 401) { router.replace('/login'); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Saqlanmadi.');
      setNotice(editId
        ? (data.fileReplaced ? 'Test va HTML fayli yangilandi.' : 'Test sozlamalari yangilandi.')
        : 'Yangi test muvaffaqiyatli yuklandi.');
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  function edit(test: TestRow) {
    setTab('tests');
    setEditId(test.id);
    setForm({
      title: test.title,
      description: test.description || '',
      track: test.track,
      skill: test.skill,
      status: test.status,
      durationMinutes: Number(test.duration_minutes) || 60,
    });
    setFile(null);
    setNotice('');
    setError('');
    window.scrollTo({ top: 250, behavior: 'smooth' });
  }

  async function toggleTest(test: TestRow) {
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', test.title);
      formData.append('description', test.description || '');
      formData.append('track', test.track);
      formData.append('skill', test.skill);
      formData.append('status', test.status === 'published' ? 'draft' : 'published');
      formData.append('durationMinutes', String(test.duration_minutes || 60));
      const response = await fetch(`/api/admin/tests/${test.id}`, { method: 'PATCH', body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Test holati o‘zgarmadi.');
      setNotice(test.status === 'published' ? 'Test yopildi.' : 'Test o‘quvchilar uchun ochildi.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test holati o‘zgarmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Bu test va uning HTML fayli butunlay o‘chirilsinmi?')) return;
    setError('');
    const response = await fetch(`/api/admin/tests/${id}`, { method: 'DELETE' });
    if (response.status === 401) { router.replace('/login'); return; }
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Test o‘chirilmadi.'); return; }
    setNotice('Test o‘chirildi.');
    await load();
  }

  async function changeStudentStatus(student: StudentRow) {
    const nextStatus = student.status === 'active' ? 'blocked' : 'active';
    if (nextStatus === 'blocked' && !window.confirm(`${student.firstName} ${student.lastName} bloklansinmi? Faol test sessionlari ham yopiladi.`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/students/${student.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Student statusi yangilanmadi.');
      setNotice(nextStatus === 'blocked' ? 'O‘quvchi bloklandi.' : 'O‘quvchi blokdan chiqarildi.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Student statusi yangilanmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null);
    setError('');
  }

  const headlineMetrics = [
    { label: 'O‘QUVCHILAR', value: overview?.metrics.students ?? '—', note: `${overview?.metrics.activeStudents ?? 0} active` },
    { label: 'YAKUNLANGAN', value: overview?.metrics.completedResults ?? '—', note: 'natija' },
    { label: 'O‘RTACHA', value: overview?.metrics.averageAccuracy != null ? `${overview.metrics.averageAccuracy}%` : '—', note: 'accuracy' },
    { label: 'LIVE TEST', value: testStats.published, note: `${testStats.draft} yopiq` },
  ];

  return (
    <div className="adminWorkspace">
      <header className="adminTopbar">
        <div className="adminBrand"><span><ArkLogoIcon /></span><div><strong>ARK Control</strong><small>EXAM OPERATIONS</small></div></div>
        <nav className="adminNav" aria-label="Admin bo‘limlari">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutGridIcon /> Overview</button>
          <button className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}><LibraryIcon /> Testlar</button>
          <button className={tab === 'students' ? 'active' : ''} onClick={() => setTab('students')}><UserIcon /> O‘quvchilar</button>
        </nav>
        <div className="adminTopActions"><span className="adminSecureChip"><ShieldCheckIcon /> Secure session</span><button type="button" onClick={logout}><LogOutIcon /> Chiqish</button></div>
      </header>

      <main className="adminMain">
        <section className="adminHero">
          <div><span><LayoutGridIcon /> LIVE EXAM CONTROL</span><h1>Admin boshqaruvi</h1><p>Testlar, o‘quvchilar, urinishlar va natijalar yagona professional panelda.</p></div>
          <div className="adminMetrics adminMetricsFour">
            {headlineMetrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.note}</span></div>)}
          </div>
        </section>

        {(error || notice) && <div className={error ? 'adminAlert adminAlertError' : 'adminAlert adminAlertSuccess'}>{error || notice}</div>}

        {tab === 'overview' && (
          <section className="adminOverview">
            {analyticsError ? <div className="adminAnalyticsSetup"><ShieldCheckIcon /><div><h2>Statistika bazasi tayyorlanishi kerak</h2><p>{analyticsError}</p></div></div> : loading || !overview ? (
              <div className="adminLoading"><span /><p>Statistika hisoblanmoqda…</p></div>
            ) : (
              <>
                <div className="adminChartGrid">
                  <article className="adminPanel adminActivityPanel">
                    <div className="adminPanelHeading"><div><small>7 KUNLIK FAOLLIK</small><h2>Yakunlangan testlar</h2></div><strong>{overview.metrics.completedResults}</strong></div>
                    <div className="adminBarChart">
                      {overview.activity.map((item) => (
                        <div key={item.date}><span style={{ height: `${Math.max(5, (item.count / maxActivity) * 100)}%` }}><i>{item.count}</i></span><small>{new Intl.DateTimeFormat('uz-UZ', { weekday: 'short' }).format(new Date(`${item.date}T12:00:00Z`))}</small></div>
                      ))}
                    </div>
                  </article>

                  <article className="adminPanel adminSkillPanel">
                    <div className="adminPanelHeading"><div><small>SKILL PERFORMANCE</small><h2>O‘rtacha aniqlik</h2></div></div>
                    <div className="adminSkillBars">
                      {overview.skills.length ? overview.skills.map((item) => (
                        <div key={item.skill}><span><b>{item.skill}</b><small>{item.attempts} urinish</small></span><i><em style={{ width: `${Math.max(2, item.average)}%` }} /></i><strong>{item.average}%</strong></div>
                      )) : <p>Yakunlangan natijalar hali yo‘q.</p>}
                    </div>
                  </article>
                </div>

                <div className="adminOverviewGrid">
                  <article className="adminPanel">
                    <div className="adminPanelHeading"><div><small>SO‘NGGI NATIJALAR</small><h2>Real-time activity</h2></div><button onClick={() => setTab('students')}>Barchasi</button></div>
                    <div className="adminRecentResults">
                      {overview.results.slice(0, 7).map((result) => {
                        const student = overview.students.find((item) => item.id === result.studentId);
                        return <div key={result.id}><span className="adminResultAvatar">{student?.firstName?.[0] || 'S'}</span><div><b>{student ? `${student.firstName} ${student.lastName}` : 'Student'}</b><small>{result.title} · {formatDate(result.completedAt || result.startedAt, true)}</small></div><strong>{result.band != null ? `Band ${result.band}` : result.accuracy != null ? `${result.accuracy}%` : result.status}</strong></div>;
                      })}
                    </div>
                  </article>

                  <article className="adminPanel">
                    <div className="adminPanelHeading"><div><small>TOP O‘QUVCHILAR</small><h2>Umumiy natija</h2></div></div>
                    <div className="adminLeaderboard">
                      {[...overview.students].sort((a, b) => (b.averageAccuracy || 0) - (a.averageAccuracy || 0)).slice(0, 6).map((student, index) => (
                        <button key={student.id} onClick={() => { setSelectedStudentId(student.id); setTab('students'); }}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{student.firstName} {student.lastName}</b><small>{student.testsCompleted} test · {student.averageBand != null ? `Band ${student.averageBand}` : 'No band'}</small></div><strong>{student.averageAccuracy != null ? `${student.averageAccuracy}%` : '—'}</strong></button>
                      ))}
                    </div>
                  </article>
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'tests' && (
          <section className="adminLayout">
            <div className="adminFormCard">
              <div className="adminSectionHeader"><span>{editId ? <EditIcon /> : <UploadCloudIcon />}</span><div><h2>{editId ? 'Testni tahrirlash' : 'Yangi test yuklash'}</h2><p>{editId ? 'Sozlamalarni yangilang yoki HTML faylni almashtiring.' : 'HTML fayl va exam sozlamalarini kiriting.'}</p></div></div>
              <form className="adminForm" onSubmit={submit}>
                <div className="field"><label htmlFor="admin-title">Test nomi</label><input id="admin-title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="IELTS Academic Reading · Test 01" maxLength={120} /></div>
                <div className="twoFields">
                  <div className="field"><label htmlFor="admin-track">Imtihon</label><select id="admin-track" value={form.track} onChange={(event) => setForm((value) => ({ ...value, track: event.target.value as Track }))}><option value="ielts">IELTS</option><option value="cefr">CEFR</option></select></div>
                  <div className="field"><label htmlFor="admin-skill">Skill</label><select id="admin-skill" value={form.skill} onChange={(event) => setForm((value) => ({ ...value, skill: event.target.value as Skill }))}><option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option><option value="full-mock">Full mock</option></select></div>
                </div>
                <div className="twoFields">
                  <div className="field"><label htmlFor="admin-status">Test holati</label><select id="admin-status" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as Status }))}><option value="published">Ochiq — start berilgan</option><option value="draft">Yopiq — faqat admin</option></select></div>
                  <div className="field"><label htmlFor="admin-duration">Vaqt (daqiqa)</label><input id="admin-duration" type="number" min={5} max={240} value={form.durationMinutes} onChange={(event) => setForm((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></div>
                </div>
                <div className="field"><label htmlFor="admin-description">Qisqa izoh</label><textarea id="admin-description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Test haqida qisqa tavsif…" maxLength={500} /></div>
                <label className="dropZone"><input type="file" accept=".html,.htm,text/html" onChange={onFile} /><span><UploadCloudIcon /></span><div><b>{file ? file.name : editId ? 'Yangi HTML tanlash — ixtiyoriy' : 'HTML faylni tanlang'}</b><small>{file ? `${(file.size / 1024).toFixed(0)} KB · Yuklashga tayyor` : editId ? 'Test ID saqlangan holda fayl almashtiriladi.' : '.html yoki .htm · maksimal 10 MB'}</small></div></label>
                <div className="formActions"><button className="pButton pButtonPrimary" disabled={busy}>{busy ? 'Saqlanmoqda…' : editId ? 'O‘zgarishlarni saqlash' : 'Testni yuklash'}</button>{editId && <button type="button" className="pButton pButtonGhost" onClick={reset}>Bekor qilish</button>}</div>
              </form>
            </div>

            <div className="adminLibrary">
              <div className="adminLibraryHeader"><div className="adminSectionHeader"><span><LibraryIcon /></span><div><h2>Test boshqaruvi</h2><p>Start, stop, preview va tahrirlash.</p></div></div><label className="adminSearch"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Test qidirish…" /></label></div>
              {loading ? <div className="adminLoading"><span /><p>Testlar yuklanmoqda…</p></div> : filteredTests.length === 0 ? <div className="emptyState"><span className="emptyIcon"><FileTextIcon /></span><h3>Test topilmadi</h3><p>Yangi HTML testingizni forma orqali yuklang.</p></div> : <div className="adminTestList">{filteredTests.map((test) => <article className="adminTestRow" key={test.id}><span className="adminTestFile"><FileTextIcon /></span><div className="adminTestCopy"><div><span>{test.track.toUpperCase()} · {test.skill.toUpperCase()} · {test.duration_minutes || 60} MIN</span><i className={test.status === 'published' ? 'isPublished' : 'isDraft'}>{test.status === 'published' ? 'OPEN' : 'CLOSED'}</i></div><h3>{test.title}</h3><small>{test.file_name} · {formatDate(test.updated_at)}</small></div><div className="adminRowActions adminRowActionsWide"><button type="button" className={test.status === 'published' ? 'stopTest' : 'startTest'} onClick={() => toggleTest(test)} disabled={busy}>{test.status === 'published' ? 'Yopish' : 'Start'}</button><a href={`/api/tests/${test.id}/content?preview=1`} target="_blank" rel="noopener noreferrer" title="Preview"><ArrowUpRightIcon /></a><button type="button" onClick={() => edit(test)} title="Tahrirlash"><EditIcon /></button><button type="button" className="danger" onClick={() => remove(test.id)} title="O‘chirish"><TrashIcon /></button></div></article>)}</div>}
            </div>
          </section>
        )}

        {tab === 'students' && (
          <section className="adminStudentsLayout">
            {analyticsError ? <div className="adminAnalyticsSetup"><ShieldCheckIcon /><div><h2>O‘quvchilar statistikasi tayyor emas</h2><p>{analyticsError}</p></div></div> : (
              <>
                <aside className="adminStudentList adminPanel">
                  <div className="adminStudentListHead"><div><small>O‘QUVCHILAR</small><h2>{overview?.students.length || 0} ta profil</h2></div><label className="adminSearch"><SearchIcon /><input value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Ism yoki Telegram ID…" /></label></div>
                  <div className="adminStudentRows">
                    {filteredStudents.map((student) => <button className={selectedStudent?.id === student.id ? 'active' : ''} key={student.id} onClick={() => setSelectedStudentId(student.id)}><span>{student.firstName[0] || 'S'}{student.lastName[0] || ''}</span><div><b>{student.firstName} {student.lastName}</b><small>{student.testsCompleted} test · {student.lastActivity ? formatDate(student.lastActivity) : 'faollik yo‘q'}</small></div><i className={student.status === 'active' ? 'active' : 'blocked'}>{student.status === 'active' ? 'ACTIVE' : 'BLOCKED'}</i></button>)}
                  </div>
                </aside>

                <div className="adminStudentDetail adminPanel">
                  {selectedStudent ? (
                    <>
                      <div className="adminStudentProfile">
                        <span>{selectedStudent.firstName[0] || 'S'}{selectedStudent.lastName[0] || ''}</span>
                        <div><small>STUDENT PROFILE</small><h2>{selectedStudent.firstName} {selectedStudent.lastName}</h2><p>{selectedStudent.username ? `@${selectedStudent.username}` : 'Username yo‘q'} · ID {selectedStudent.telegramId}</p></div>
                        <button className={selectedStudent.status === 'active' ? 'banStudent' : 'unbanStudent'} onClick={() => changeStudentStatus(selectedStudent)} disabled={busy}>{selectedStudent.status === 'active' ? 'Bloklash' : 'Blokdan chiqarish'}</button>
                      </div>

                      <div className="adminStudentSummary">
                        <div className="adminAccuracyRing" style={{ background: `conic-gradient(#ff6b58 ${Math.max(0, Math.min(100, selectedStudent.averageAccuracy || 0)) * 3.6}deg,#eee6da 0deg)` }}><span><strong>{selectedStudent.averageAccuracy != null ? `${selectedStudent.averageAccuracy}%` : '—'}</strong><small>AVG ACCURACY</small></span></div>
                        <div><small>YAKUNLANGAN</small><strong>{selectedStudent.testsCompleted}</strong><span>test</span></div>
                        <div><small>OVERALL BAND</small><strong>{selectedStudent.averageBand ?? '—'}</strong><span>average</span></div>
                        <div><small>WARNING</small><strong>{selectedStudent.violations}</strong><span>fullscreen exit</span></div>
                      </div>

                      <div className="adminStudentTrend">
                        <div><small>PERFORMANCE TREND</small><h3>Oxirgi natijalar</h3></div>
                        {selectedTrend.length ? <div className="adminStudentTrendBars">{selectedTrend.map((result) => <span key={result.id} title={`${result.title}: ${result.accuracy}%`}><i style={{ height: `${Math.max(4, result.accuracy || 0)}%` }} /><small>{result.skill.slice(0, 3).toUpperCase()}</small></span>)}</div> : <p>Trend uchun yakunlangan natija hali yo‘q.</p>}
                      </div>

                      <div className="adminStudentResultsHead"><div><small>NATIJALAR TARIXI</small><h3>Barcha testlar</h3></div><span>{selectedResults.length} ta yozuv</span></div>
                      <div className="adminStudentResults">
                        {selectedResults.length ? selectedResults.map((result) => <article key={result.id}><div><span>{result.skill.toUpperCase()}</span><h4>{result.title}</h4><small>{formatDate(result.completedAt || result.startedAt, true)} · {formatDuration(result.durationSeconds)}</small></div><div className="adminResultNumbers"><span><small>SCORE</small><b>{result.score != null ? `${result.score}/${result.maxScore ?? '—'}` : '—'}</b></span><span><small>BAND</small><b>{result.band ?? '—'}</b></span><span><small>ACCURACY</small><b>{result.accuracy != null ? `${result.accuracy}%` : '—'}</b></span><span><small>CORRECT</small><b>{result.correct ?? '—'}</b></span><span><small>WRONG</small><b>{result.wrong ?? '—'}</b></span><span><small>EMPTY</small><b>{result.unanswered ?? '—'}</b></span><span><small>WARNING</small><b>{result.violations}</b></span></div></article>) : <div className="adminNoResults"><FileTextIcon /><p>Bu o‘quvchida hali saqlangan natija yo‘q.</p></div>}
                      </div>
                    </>
                  ) : <div className="adminNoResults"><UserIcon /><p>O‘quvchini tanlang.</p></div>}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
