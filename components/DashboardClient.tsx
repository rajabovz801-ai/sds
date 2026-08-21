'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listTests, StoredTest } from '@/lib/testStore';

const skillOrder = ['listening','reading','writing','speaking'] as const;

export function DashboardClient() {
  const [tests,setTests]=useState<StoredTest[]>([]);
  useEffect(()=>{ listTests().then(setTests).catch(()=>setTests([])); },[]);
  const published=useMemo(()=>tests.filter(t=>t.status==='published'),[tests]);
  return (
    <>
      <section className="pageHeading">
        <div className="pageHeadingCopy"><h1>Xush kelibsiz 👋</h1><p>Mock testlar, natijalar va keyingi practice bitta joyda.</p></div>
        <div className="headingActions"><Link className="pButton pButtonGhost" href="/">Landing page</Link><Link className="pButton pButtonPrimary" href="/admin">Test qo‘shish</Link></div>
      </section>

      <section className="metricGrid">
        <article className="metricCard red"><div className="metricTop"><span>Total tests</span><span className="metricIcon">T</span></div><strong>{published.length}</strong><small>Published tests</small></article>
        <article className="metricCard green"><div className="metricTop"><span>Completed</span><span className="metricIcon">✓</span></div><strong>0</strong><small>Student activity</small></article>
        <article className="metricCard blue"><div className="metricTop"><span>Average score</span><span className="metricIcon">%</span></div><strong>—</strong><small>Results module soon</small></article>
        <article className="metricCard amber"><div className="metricTop"><span>Target</span><span className="metricIcon">◎</span></div><strong>7.0+</strong><small>IELTS target</small></article>
      </section>

      <section className="dashboardGrid">
        <div className="panel">
          <div className="panelHeader"><div><h2>Skill performance</h2><p>Natijalar yig‘ilgach shu yerda progress ko‘rinadi.</p></div></div>
          <div className="panelBody"><div className="skillRows">{skillOrder.map(skill=><article className="skillItem" key={skill}><div className="skillHead"><span className="skillName">{skill[0].toUpperCase()+skill.slice(1)}</span><span className="skillState">No data</span></div><div className="skillBar"><span/></div><div className="skillFoot"><span>0</span><span>100</span></div></article>)}</div></div>
        </div>
        <div className="panel">
          <div className="panelHeader"><div><h2>Recent activity</h2><p>So‘nggi testlar va o‘zgarishlar.</p></div></div>
          <div className="panelBody">
            {tests.length===0 ? <div className="emptyState"><div className="emptyIcon">↗</div><h3>Hali test yo‘q</h3><p>Admin paneldan HTML test yuklang. U darhol shu dashboardda ko‘rinadi.</p><Link className="pButton pButtonPrimary" href="/admin">Admin panel</Link></div> : <div className="activityList">{tests.slice(0,5).map(t=><div className="activityItem" key={t.id}><span className="activityDot"/><div className="activityText"><b>{t.title}</b><span>{t.track.toUpperCase()} • {t.skill} • {t.status}</span></div></div>)}</div>}
          </div>
        </div>
      </section>

      <section className="panel" style={{marginTop:14}}>
        <div className="panelHeader"><div><h2>Available mock tests</h2><p>Published HTML testlar sayt ichida ochiladi.</p></div><span style={{fontSize:11,color:'#8d94a1'}}>{published.length} ta</span></div>
        <div className="panelBody">
          {published.length===0 ? <div className="emptyState"><div className="emptyIcon">HTML</div><h3>Published test topilmadi</h3><p>Admin panelda HTML fayl yuklab, statusni Published qilib saqlang.</p></div> : <div className="testList">{published.map(t=><article className="testRow" key={t.id}><div className="testBadge">{t.track.toUpperCase().slice(0,2)}</div><div className="testInfo"><h3>{t.title}</h3><div className="testMeta"><span className="metaPill">{t.track.toUpperCase()}</span><span className="metaPill">{t.skill}</span><span className="metaPill">{t.fileName}</span></div></div><Link className="pButton pButtonPrimary pButtonSmall" href={`/test/${t.id}`}>Open test</Link></article>)}</div>}
        </div>
      </section>
    </>
  );
}
