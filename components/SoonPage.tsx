import Link from 'next/link';

export function SoonPage({title,description,features}:{title:string;description:string;features:string[]}){
  return <section className="soonPage"><div className="soonCard"><div className="soonMark">SOON</div><h1>{title}</h1><p>{description}</p><div className="soonFeatures">{features.map(f=><span key={f}>{f}</span>)}</div><Link className="pButton pButtonGhost" href="/dashboard">← Dashboard</Link></div></section>;
}
