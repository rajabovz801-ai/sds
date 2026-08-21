'use client';

import Link from 'next/link';
import { useEffect,useState } from 'react';

type ViewerData={test:{id:string;title:string;track:string;skill:string;fileName:string};url:string};

export function TestViewerClient({id}:{id:string}){
  const [data,setData]=useState<ViewerData|null|undefined>(undefined);
  useEffect(()=>{fetch(`/api/tests/${id}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Test topilmadi');setData(d)}).catch(()=>setData(null))},[id]);
  if(data===undefined)return <div className="viewerLoading">Test yuklanmoqda…</div>;
  if(data===null)return <div className="viewerLoading"><div style={{textAlign:'center'}}><b>Test topilmadi</b><div style={{marginTop:10}}><Link href="/dashboard" className="pButton pButtonGhost">Dashboard</Link></div></div></div>;
  return <div className="viewerRoot"><div className="viewerBar"><Link href="/dashboard" className="viewerBack">← Back</Link><div className="viewerTitle"><b>{data.test.title}</b><span>{data.test.track.toUpperCase()} • {data.test.skill} • {data.test.fileName}</span></div><Link href="/admin" className="pButton pButtonGhost pButtonSmall">Admin</Link></div><iframe className="viewerFrame" title={data.test.title} sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin" src={data.url}/></div>;
}
