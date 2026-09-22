'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import {
  ArrowUpRightIcon,
  EditIcon,
  FileTextIcon,
  LibraryIcon,
  LogOutIcon,
  SearchIcon,
  TrashIcon,
  UploadCloudIcon,
} from '@/components/UiIcons';

type Skill = 'reading' | 'listening';
type Status = 'published' | 'draft';
type TestCollection = 'real-exam' | 'cambridge' | 'gold';
type TestScope = 'full-test' | 'passage-1' | 'passage-2' | 'passage-3' | 'part-1' | 'part-2' | 'part-3' | 'part-4';

type TestRow = {
  id: string;
  title: string;
  description: string;
  track: 'ielts';
  skill: Skill;
  status: Status;
  test_scope?: TestScope | null;
  test_collection?: TestCollection | null;
  duration_minutes?: number;
  file_name: string;
  file_path: string;
  updated_at: string;
};

type FormState = {
  title: string;
  description: string;
  skill: Skill;
  status: Status;
  testScope: TestScope;
  testCollection: TestCollection;
  durationMinutes: number;
};

const blank: FormState = {
  title: '',
  description: '',
  skill: 'reading',
  status: 'published',
  testScope: 'full-test',
  testCollection: 'real-exam',
  durationMinutes: 60,
};

const collectionLabels: Record<TestCollection, string> = {
  'real-exam': 'Real Exam',
  cambridge: 'Cambridge',
  gold: 'Gold',
};

const readingScopes: Array<{ value: TestScope; label: string }> = [
  { value: 'full-test', label: 'Full Test' },
  { value: 'passage-1', label: 'Reading 1' },
  { value: 'passage-2', label: 'Reading 2' },
  { value: 'passage-3', label: 'Reading 3' },
];

const listeningScopes: Array<{ value: TestScope; label: string }> = [
  { value: 'full-test', label: 'Full Test' },
  { value: 'part-1', label: 'Listening 1' },
  { value: 'part-2', label: 'Listening 2' },
  { value: 'part-3', label: 'Listening 3' },
  { value: 'part-4', label: 'Listening 4' },
];

function formatDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function scopeLabel(test: TestRow) {
  if (test.test_scope === 'full-test') return 'FULL TEST';
  if (test.test_scope?.startsWith('passage-')) return `READING ${test.test_scope.slice(-1)}`;
  if (test.test_scope?.startsWith('part-')) return `LISTENING ${test.test_scope.slice(-1)}`;
  return 'FULL TEST';
}

export function AdminClient() {
  const router = useRouter();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Testlar yuklanmadi.');
      setTests(body.tests || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Testlar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const filteredTests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tests;
    return tests.filter((test) => `${test.title} ${test.skill} ${test.test_scope || ''} ${test.test_collection || 'real-exam'} ${test.status}`.toLowerCase().includes(normalized));
  }, [query, tests]);

  const publishedCount = tests.filter((test) => test.status === 'published').length;
  const scopeOptions = form.skill === 'reading' ? readingScopes : listeningScopes;

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
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('track', 'ielts');
      formData.append('skill', form.skill);
      formData.append('status', form.status);
      formData.append('testScope', form.testScope);
      formData.append('testCollection', form.testCollection);
      formData.append('durationMinutes', String(form.durationMinutes));
      if (file) formData.append('file', file);

      const response = editId
        ? await fetch(`/api/admin/tests/${editId}`, { method: 'PATCH', body: formData })
        : await fetch('/api/admin/tests', { method: 'POST', body: formData });

      if (response.status === 401) { router.replace('/login'); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Saqlanmadi.');

      setNotice(editId
        ? (data.fileReplaced ? 'Test va HTML fayli yangilandi.' : 'Test sozlamalari yangilandi.')
        : 'Yangi test yuklandi.');
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  function edit(test: TestRow) {
    const fallbackScope: TestScope = 'full-test';
    const allowed = test.skill === 'reading' ? readingScopes.map((item) => item.value) : listeningScopes.map((item) => item.value);
    setEditId(test.id);
    setForm({
      title: test.title,
      description: test.description || '',
      skill: test.skill,
      status: test.status,
      testScope: allowed.includes(test.test_scope as TestScope) ? test.test_scope as TestScope : fallbackScope,
      testCollection: test.test_collection || 'real-exam',
      durationMinutes: Number(test.duration_minutes) || 60,
    });
    setFile(null);
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleTest(test: TestRow) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('title', test.title);
      formData.append('description', test.description || '');
      formData.append('track', 'ielts');
      formData.append('skill', test.skill);
      formData.append('status', test.status === 'published' ? 'draft' : 'published');
      formData.append('testScope', test.test_scope || 'full-test');
      formData.append('testCollection', test.test_collection || 'real-exam');
      formData.append('durationMinutes', String(test.duration_minutes || 60));

      const response = await fetch(`/api/admin/tests/${test.id}`, { method: 'PATCH', body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Test holati o‘zgarmadi.');
      setNotice(test.status === 'published' ? 'Test yopildi.' : 'Test ochildi.');
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
    setNotice('');
    const response = await fetch(`/api/admin/tests/${id}`, { method: 'DELETE' });
    if (response.status === 401) { router.replace('/login'); return; }
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Test o‘chirilmadi.'); return; }
    setNotice('Test o‘chirildi.');
    await load();
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

  return (
    <div className="adminWorkspace">
      <header className="adminTopbar">
        <div className="adminBrand"><span><ArkLogoIcon /></span><div><strong>ARK Control</strong><small>IELTS TEST UPLOAD</small></div></div>
        <nav className="adminNav" aria-label="Admin bo‘limlari">
          <button className="active" type="button"><LibraryIcon /> Testlar</button>
        </nav>
        <div className="adminTopActions"><button type="button" onClick={logout}><LogOutIcon /> Chiqish</button></div>
      </header>

      <main className="adminMain">
        <section className="adminHero">
          <div><span><LibraryIcon /> ARK IELTS · CONTENT</span><h1>Test yuklash</h1><p>Faqat Reading va Listening. Collection, part va HTML faylni tanlang.</p></div>
          <div className="adminMetrics adminMetricsFour">
            <div><small>JAMI</small><strong>{tests.length}</strong><span>IELTS test</span></div>
            <div><small>OCHIQ</small><strong>{publishedCount}</strong><span>studentlarga ko‘rinadi</span></div>
            <div><small>YOPIQ</small><strong>{tests.length - publishedCount}</strong><span>draft</span></div>
          </div>
        </section>

        {(error || notice) && <div className={error ? 'adminAlert adminAlertError' : 'adminAlert adminAlertSuccess'}>{error || notice}</div>}

        <section className="adminLayout">
          <div className="adminFormCard">
            <div className="adminSectionHeader"><span>{editId ? <EditIcon /> : <UploadCloudIcon />}</span><div><h2>{editId ? 'Testni tahrirlash' : 'Yangi test yuklash'}</h2><p>Kerakli maydonlargina qoldirilgan.</p></div></div>
            <form className="adminForm" onSubmit={submit}>
              <div className="field"><label htmlFor="admin-title">Test nomi</label><input id="admin-title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Cambridge Reading Test 1" maxLength={120} /></div>

              <div className="twoFields">
                <div className="field"><label htmlFor="admin-collection">Collection</label><select id="admin-collection" value={form.testCollection} onChange={(event) => setForm((value) => ({ ...value, testCollection: event.target.value as TestCollection }))}><option value="real-exam">Real Exam</option><option value="cambridge">Cambridge</option><option value="gold">Gold</option></select></div>
                <div className="field"><label htmlFor="admin-skill">Skill</label><select id="admin-skill" value={form.skill} onChange={(event) => setForm((value) => ({ ...value, skill: event.target.value as Skill, testScope: 'full-test' }))}><option value="reading">Reading</option><option value="listening">Listening</option></select></div>
              </div>

              <div className="twoFields">
                <div className="field"><label htmlFor="admin-test-scope">Bo‘lim</label><select id="admin-test-scope" value={form.testScope} onChange={(event) => setForm((value) => ({ ...value, testScope: event.target.value as TestScope }))}>{scopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div className="field"><label htmlFor="admin-status">Holati</label><select id="admin-status" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as Status }))}><option value="published">Ochiq</option><option value="draft">Yopiq</option></select></div>
              </div>

              <div className="field"><label htmlFor="admin-duration">Vaqt (daqiqa)</label><input id="admin-duration" type="number" min={5} max={240} value={form.durationMinutes} onChange={(event) => setForm((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} /></div>
              <div className="field"><label htmlFor="admin-description">Izoh — ixtiyoriy</label><textarea id="admin-description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Qisqa tavsif…" maxLength={500} /></div>

              <label className="dropZone"><input type="file" accept=".html,.htm,text/html" onChange={onFile} /><span><UploadCloudIcon /></span><div><b>{file ? file.name : editId ? 'HTML almashtirish — ixtiyoriy' : 'HTML faylni tanlang'}</b><small>{file ? `${(file.size / 1024).toFixed(0)} KB · tayyor` : editId ? 'Fayl tanlanmasa eski HTML qoladi.' : '.html yoki .htm · maksimal 50 MB'}</small></div></label>

              <div className="formActions"><button className="pButton pButtonPrimary" disabled={busy}>{busy ? 'Saqlanmoqda…' : editId ? 'Saqlash' : 'Yuklash'}</button>{editId && <button type="button" className="pButton pButtonGhost" onClick={reset}>Bekor qilish</button>}</div>
            </form>
          </div>

          <div className="adminLibrary">
            <div className="adminLibraryHeader"><div className="adminSectionHeader"><span><LibraryIcon /></span><div><h2>Testlar</h2><p>Ochiq/yopiq, preview, edit va delete.</p></div></div><label className="adminSearch"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Qidirish…" /></label></div>
            {loading ? <div className="adminLoading"><span /><p>Testlar yuklanmoqda…</p></div> : filteredTests.length === 0 ? <div className="emptyState"><span className="emptyIcon"><FileTextIcon /></span><h3>Test yo‘q</h3><p>Chap tomondan yangi HTML test yuklang.</p></div> : <div className="adminTestList">{filteredTests.map((test) => <article className="adminTestRow" key={test.id}><span className="adminTestFile"><FileTextIcon /></span><div className="adminTestCopy"><div><span>{collectionLabels[test.test_collection || 'real-exam'].toUpperCase()} · {test.skill.toUpperCase()} · {scopeLabel(test)}</span><i className={test.status === 'published' ? 'isPublished' : 'isDraft'}>{test.status === 'published' ? 'OPEN' : 'CLOSED'}</i></div><h3>{test.title}</h3><small>{test.file_name} · {formatDate(test.updated_at)}</small></div><div className="adminRowActions adminRowActionsWide"><button type="button" className={test.status === 'published' ? 'stopTest' : 'startTest'} onClick={() => toggleTest(test)} disabled={busy}>{test.status === 'published' ? 'Yopish' : 'Ochish'}</button><a href={`/api/tests/${test.id}/content?preview=1`} target="_blank" rel="noopener noreferrer" title="Preview"><ArrowUpRightIcon /></a><button type="button" onClick={() => edit(test)} title="Tahrirlash"><EditIcon /></button><button type="button" className="danger" onClick={() => remove(test.id)} title="O‘chirish"><TrashIcon /></button></div></article>)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
