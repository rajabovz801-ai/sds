'use client';

import Link from 'next/link';
import { useEffect,useState } from 'react';
import { getTest,StoredTest } from '@/lib/testStore';

export function TestViewerClient({id}:{id:string}){
  const [test,setTest]=useState<StoredTest|null|undefined>(undefined);
  useEffect(()=>{getTest(id).then(t=>setTest(t||null)).catch(()=>setTest(null))},[id]);
  if(test===undefined)return <div className="viewerLoading">Test yuklanmoqda…</div>;
  if(test===null)return <div className="viewerLoading"><div style={{textAlign:'center'}}><b>Test topilmadi</b><div style={{marginTop:10}}><Link href="/dashboard" className="pButton pButtonGhost">Dashboard</Link></div></div></div>;
  return <div className="viewerRoot"><div className="viewerBar"><Link href="/dashboard" className="viewerBack">← Back</Link><div className="viewerTitle"><b>{test.title}</b><span>{test.track.toUpperCase()} • {test.skill} • {test.fileName}</span></div><Link href="/admin" className="pButton pButtonGhost pButtonSmall">Admin</Link></div><iframe className="viewerFrame" title={test.title} sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin" srcDoc={test.html}/></div>;
}
