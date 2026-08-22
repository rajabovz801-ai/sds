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
} from '@/components/UiIcons';

type Track = 'ielts' | 'cefr';
type Skill = 'reading' | 'listening' | 'writing' | 'speaking' | 'full-mock';
type Status = 'published' | 'draft';
type TestRow = {
  id: string; title: string; description: string; track: Track; skill: Skill; status: Status;
  file_name: string; file_path: string; updated_at: string;
};
type FormState = { title: string; description: string; track: Track; skill: Skill; status: Status };

const blank: FormState = { title: '', description: '', track: 'ielts', skill: 'reading', status: 'published' };

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
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Testlar yuklanmadi.');
      setTests(data.tests || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin ma’lumotlari yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    all: tests.length,
    published: tests.filter((test) => test.status === 'published').length,
    draft: tests.filter((test) => test.status === 'draft').length,
  }), [tests]);

  const filteredTests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tests;
    return tests.filter((test) => `${test.title} ${test.track} ${test.skill} ${test.status}`.toLowerCase().includes(normalized));
  }, [query, tests]);

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
      let response: Response;
      if (editId) {
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));
        if (file) formData.append('file', file);
        response = await fetch(`/api/admin/tests/${editId}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));
        formData.append('file', file as File);
        response = await fetch('/api/admin/tests', { method: 'POST', body: formData });
      }

      if (response.status === 401) { router.replace('/login'); return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Saqlanmadi.');
      setNotice(editId ? (data.fileReplaced ? 'Test va uning HTML fayli yangilandi.' : 'Test ma’lumotlari yangilandi.') : 'Yangi test muvaffaqiyatli yuklandi.');
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  function edit(test: TestRow) {
    setEditId(test.id);
    setForm({ title: test.title, description: test.description || '', track: test.track, skill: test.skill, status: test.status });
    setFile(null);
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="adminBrand"><span><ArkLogoIcon /></span><div><strong>ARK Control</strong><small>CONTENT OPERATIONS</small></div></div>
        <div className="adminTopActions"><span className="adminSecureChip"><ShieldCheckIcon /> Secure admin session</span><button type="button" onClick={logout}><LogOutIcon /> Chiqish</button></div>
      </header>

      <main className="adminMain">
        <section className="adminHero">
          <div><span><LayoutGridIcon /> ADMIN WORKSPACE</span><h1>Content boshqaruvi</h1><p>HTML mock testlarni yuklang, tartiblang va o‘quvchilar uchun nashr qiling.</p></div>
          <div className="adminMetrics">
            <div><small>JAMI</small><strong>{stats.all}</strong><span>test</span></div>
            <div><small>LIVE</small><strong>{stats.published}</strong><span>published</span></div>
            <div><small>DRAFT</small><strong>{stats.draft}</strong><span>kutilmoqda</span></div>
          </div>
        </section>

        {(error || notice) && <div className={error ? 'adminAlert adminAlertError' : 'adminAlert adminAlertSuccess'}>{error || notice}</div>}

        <section className="adminLayout">
          <div className="adminFormCard">
            <div className="adminSectionHeader"><span>{editId ? <EditIcon /> : <UploadCloudIcon />}</span><div><h2>{editId ? 'Testni tahrirlash' : 'Yangi test yuklash'}</h2><p>{editId ? 'Ma’lumotlarni yangilang yoki bog‘lanishni buzmasdan HTML faylni almashtiring.' : 'HTML fayl va uning ma’lumotlarini kiriting.'}</p></div></div>
            <form className="adminForm" onSubmit={submit}>
              <div className="field"><label htmlFor="admin-title">Test nomi</label><input id="admin-title" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="IELTS Academic Reading · Test 01" maxLength={120} /></div>
              <div className="twoFields">
                <div className="field"><label htmlFor="admin-track">Imtihon</label><select id="admin-track" value={form.track} onChange={(event) => setForm((value) => ({ ...value, track: event.target.value as Track }))}><option value="ielts">IELTS</option><option value="cefr">CEFR</option></select></div>
                <div className="field"><label htmlFor="admin-skill">Skill</label><select id="admin-skill" value={form.skill} onChange={(event) => setForm((value) => ({ ...value, skill: event.target.value as Skill }))}><option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option><option value="full-mock">Full mock</option></select></div>
              </div>
              <div className="field"><label htmlFor="admin-status">Holati</label><select id="admin-status" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as Status }))}><option value="published">Published — o‘quvchilarga ochiq</option><option value="draft">Draft — faqat admin uchun</option></select></div>
              <div className="field"><label htmlFor="admin-description">Qisqa izoh</label><textarea id="admin-description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Test haqida qisqa tavsif…" maxLength={500} /></div>
              <label className="dropZone"><input type="file" accept=".html,.htm,text/html" onChange={onFile} /><span><UploadCloudIcon /></span><div><b>{file ? file.name : editId ? 'Yangi HTML tanlash — ixtiyoriy' : 'HTML faylni tanlang'}</b><small>{file ? `${(file.size / 1024).toFixed(0)} KB · Yuklashga tayyor` : editId ? 'Tanlansa, mavjud test ID saqlangan holda fayl almashtiriladi.' : '.html yoki .htm · maksimal 10 MB'}</small></div></label>
              <div className="formActions"><button className="pButton pButtonPrimary" disabled={busy}>{busy ? 'Saqlanmoqda…' : editId ? 'O‘zgarishlarni saqlash' : 'Testni yuklash'}</button>{editId && <button type="button" className="pButton pButtonGhost" onClick={reset}>Bekor qilish</button>}</div>
            </form>
          </div>

          <div className="adminLibrary">
            <div className="adminLibraryHeader"><div className="adminSectionHeader"><span><LibraryIcon /></span><div><h2>Test kutubxonasi</h2><p>Barcha yuklangan materiallar.</p></div></div><label className="adminSearch"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Test qidirish…" /></label></div>
            {loading ? <div className="adminLoading"><span /><p>Testlar yuklanmoqda…</p></div> : filteredTests.length === 0 ? <div className="emptyState"><span className="emptyIcon"><FileTextIcon /></span><h3>{query ? 'Mos test topilmadi' : 'Kutubxona hozircha bo‘sh'}</h3><p>{query ? 'Qidiruv so‘zini o‘zgartiring.' : 'Birinchi HTML testingizni chap tomondagi forma orqali yuklang.'}</p></div> : <div className="adminTestList">{filteredTests.map((test) => <article className="adminTestRow" key={test.id}><span className="adminTestFile"><FileTextIcon /></span><div className="adminTestCopy"><div><span>{test.track.toUpperCase()} · {test.skill.toUpperCase()}</span><i className={test.status === 'published' ? 'isPublished' : 'isDraft'}>{test.status}</i></div><h3>{test.title}</h3><small>{test.file_name} · {new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(test.updated_at))}</small></div><div className="adminRowActions">{test.status === 'published' && <a href={`/api/tests/${test.id}/content`} target="_blank" rel="noopener noreferrer" title="Ko‘rish"><ArrowUpRightIcon /></a>}<button type="button" onClick={() => edit(test)} title="Tahrirlash"><EditIcon /></button><button type="button" className="danger" onClick={() => remove(test.id)} title="O‘chirish"><TrashIcon /></button></div></article>)}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
