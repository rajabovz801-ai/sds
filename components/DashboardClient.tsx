'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import type { CloudTest } from '@/lib/cloudTests';

export function DashboardClient(){
  const [tests,setTests]=useState<CloudTest[]>([]);
  useEffect(()=>{fetch('/api/public-tests').then(r=>r.json()).then(d=>setTests(d.tests||[])).catch(()=>setTests([]))},[]);
  const published=useMemo(()=>tests.filter(t=>t.status==='published'),[tests]);
  return <>
    <section className="pageHeading"><div className="pageHeadingCopy"><h1>Xush kelibsiz 👋</h1><p>Mock testlar, natijalar va keyingi practice bitta joyda.</p></div><div className="headingActions"><Link className="pButton pButtonGhost" href="/">Landing page</Link><Link className="pButton pButtonPrimary" href="/admin">Admin panel</Link></div></section>
    <section className="metricGrid"><article className="metricCard red"><div className="metricTop"><span>Total tests</span><span className="metricIcon">T</span></div><strong>{published.length}</strong><small>Published tests</small></article><article className="metricCard green"><div className="metricTop"><span>Completed</span><span className="metricIcon">✓</span></div><strong>0</strong><small>Student activity</small></article><article className="metricCard blue"><div className="metricTop"><span>Average score</span><span className="metricIcon">%</span></div><strong>—</strong><small>Results module soon</small></article><article className="metricCard amber"><div className="metricTop"><span>Target</span><span className="metricIcon">◎</span></div><strong>7.0+</strong><small>IELTS target</small></article></section>
    <section className="panel"><div className="panelHeader"><div><h2>Available tests</h2><p>Supabase cloud’dan kelayotgan published testlar.</p></div><span style={{fontSize:11,color:'#8d94a1'}}>{published.length} ta</span></div><div className="panelBody">{published.length===0?<div className="emptyState"><div className="emptyIcon">HTML</div><h3>Published test topilmadi</h3><p>Admin panel orqali birinchi testni cloud’ga yuklang.</p></div>:<div className="testList">{published.map(t=><article className="testRow" key={t.id}><div className="testBadge">{t.track.toUpperCase().slice(0,2)}</div><div className="testInfo"><h3>{t.title}</h3><div className="testMeta"><span className="metaPill">{t.track.toUpperCase()}</span><span className="metaPill">{t.skill}</span><span className="metaPill">{t.fileName}</span></div></div><Link className="pButton pButtonPrimary pButtonSmall" href={`/test/${t.id}`}>Open test</Link></article>)}</div>}</div></section>
  </>;
}
