'use client';

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteTest, listTests, makeId, saveTest, StoredTest, TestSkill, TestStatus, TestTrack } from '@/lib/testStore';

const blank = { title:'', track:'ielts' as TestTrack, skill:'reading' as TestSkill, status:'published' as TestStatus, description:'', html:'', fileName:'' };

export function AdminClient(){
  const [tests,setTests]=useState<StoredTest[]>([]);
  const [form,setForm]=useState(blank);
  const [editId,setEditId]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [drag,setDrag]=useState(false);
  const load=()=>listTests().then(setTests).catch(()=>setTests([]));
  useEffect(()=>{load()},[]);
  const stats=useMemo(()=>({all:tests.length,published:tests.filter(t=>t.status==='published').length,draft:tests.filter(t=>t.status==='draft').length}),[tests]);

  const readFile=(file?:File)=>{
    if(!file) return;
    if(!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')){setError('Faqat .html yoki .htm fayl yuklang.');return;}
    const reader=new FileReader();
    reader.onload=()=>{setForm(v=>({...v,html:String(reader.result||''),fileName:file.name,title:v.title||file.name.replace(/\.html?$/i,'')}));setError('')};
    reader.onerror=()=>setError('Faylni o‘qib bo‘lmadi.');
    reader.readAsText(file);
  };
  const onFile=(e:ChangeEvent<HTMLInputElement>)=>readFile(e.target.files?.[0]);
  const onDrop=(e:DragEvent<HTMLLabelElement>)=>{e.preventDefault();setDrag(false);readFile(e.dataTransfer.files?.[0]);};
  const reset=()=>{setForm(blank);setEditId(null);setError('')};
  const submit=async(e:FormEvent)=>{
    e.preventDefault();
    if(!form.title.trim()){setError('Test nomini kiriting.');return;}
    if(!form.html.trim()){setError('HTML fayl yuklang.');return;}
    const now=new Date().toISOString();
    const old=editId?tests.find(t=>t.id===editId):undefined;
    const item:StoredTest={...form,title:form.title.trim(),description:form.description.trim(),id:editId||makeId(),createdAt:old?.createdAt||now,updatedAt:now};
    await saveTest(item);reset();await load();
  };
  const edit=(t:StoredTest)=>{setEditId(t.id);setForm({title:t.title,track:t.track,skill:t.skill,status:t.status,description:t.description,html:t.html,fileName:t.fileName});window.scrollTo({top:0,behavior:'smooth'});};
  const remove=async(id:string)=>{if(!confirm('Bu test o‘chirilsinmi?'))return;await deleteTest(id);if(editId===id)reset();await load();};

  return <>
    <section className="pageHeading"><div className="pageHeadingCopy"><h1>Admin panel</h1><p>HTML testlarni yuklang, bo‘limga ajrating, tahrirlang va platformada oching.</p></div><div className="headingActions"><Link href="/dashboard" className="pButton pButtonGhost">Dashboard</Link></div></section>
    <section className="adminLayout">
      <div className="adminFormCard">
        <div className="adminSectionHeader"><h2>{editId?'Testni tahrirlash':'Yangi test qo‘shish'}</h2><p>Test metadata va HTML faylini boshqaring.</p></div>
        <form className="adminForm" onSubmit={submit}>
          <div className="field"><label>Test nomi</label><input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} placeholder="Masalan: IELTS Reading Test 1"/></div>
          <div className="twoFields"><div className="field"><label>Imtihon</label><select value={form.track} onChange={e=>setForm(v=>({...v,track:e.target.value as TestTrack}))}><option value="ielts">IELTS</option><option value="cefr">CEFR</option></select></div><div className="field"><label>Skill</label><select value={form.skill} onChange={e=>setForm(v=>({...v,skill:e.target.value as TestSkill}))}><option value="reading">Reading</option><option value="listening">Listening</option><option value="writing">Writing</option><option value="speaking">Speaking</option><option value="full-mock">Full mock</option></select></div></div>
          <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm(v=>({...v,status:e.target.value as TestStatus}))}><option value="published">Published</option><option value="draft">Draft</option></select></div>
          <div className="field"><label>Izoh</label><textarea value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Qisqa tavsif yoki test haqida eslatma"/></div>
          <label className={`dropZone ${drag?'drag':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}><input type="file" accept=".html,.htm,text/html" onChange={onFile}/><div><b>HTML testni shu yerga tashlang yoki bosing</b><span className={form.fileName?'fileReady':''}>{form.fileName?`✓ ${form.fileName}`:'Faqat .html / .htm'}</span></div></label>
          {error&&<p className="formError">{error}</p>}
          <div className="formActions"><button className="pButton pButtonPrimary" type="submit">{editId?'Save changes':'Upload test'}</button>{editId&&<button type="button" className="pButton pButtonGhost" onClick={reset}>Cancel</button>}</div>
        </form>
      </div>

      <div className="adminLibrary">
        <div className="adminSectionHeader"><h2>Test library</h2><p>Barcha yuklangan testlar.</p></div>
        <div className="adminStats"><div className="miniStat"><b>{stats.all}</b><span>Total</span></div><div className="miniStat"><b>{stats.published}</b><span>Published</span></div><div className="miniStat"><b>{stats.draft}</b><span>Draft</span></div></div>
        <div className="localNotice"><span>ⓘ</span><div><b>Local-first storage</b>Hozircha testlar shu browser qurilmasida saqlanadi. Keyingi bosqichda cloud database/storage ulasak barcha qurilmada umumiy bo‘ladi.</div></div>
        {tests.length===0?<div className="emptyState"><div className="emptyIcon">HTML</div><h3>Library bo‘sh</h3><p>Birinchi HTML testni chap tomondan yuklang.</p></div>:<div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Test</th><th>Exam</th><th>Skill</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{tests.map(t=><tr key={t.id}><td><div className="adminTitle">{t.title}</div><div style={{fontSize:9,color:'#979ca6',marginTop:3}}>{t.fileName}</div></td><td>{t.track.toUpperCase()}</td><td>{t.skill}</td><td><span className={`statusPill ${t.status==='published'?'statusPublished':'statusDraft'}`}>{t.status}</span></td><td>{new Date(t.updatedAt).toLocaleDateString()}</td><td><div className="tableActions"><Link className="pButton pButtonGhost pButtonSmall" href={`/test/${t.id}`}>Open</Link><button className="pButton pButtonGhost pButtonSmall" onClick={()=>edit(t)}>Edit</button><button className="pButton pButtonDanger pButtonSmall" onClick={()=>remove(t.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}
      </div>
    </section>
  </>;
}
