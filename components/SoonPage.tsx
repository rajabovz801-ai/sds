import Link from 'next/link';
import { ArrowLeftIcon, SparklesIcon } from '@/components/UiIcons';

export function SoonPage({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <section className="soonPage">
      <div className="soonCard">
        <span className="soonMark"><SparklesIcon /></span>
        <small>NEXT WORKSPACE MODULE</small>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="soonFeatures">{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
        <Link className="pButton pButtonGhost" href="/mock"><ArrowLeftIcon /> Boshqaruvga qaytish</Link>
      </div>
    </section>
  );
}
