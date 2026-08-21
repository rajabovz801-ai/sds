import Link from 'next/link';

export function ProgramCard({
  slug,
  title,
  badge,
  description,
  items,
}: {
  slug: 'ielts' | 'cefr';
  title: string;
  badge: string;
  description: string;
  items: readonly string[];
}) {
  return (
    <article className="programCard">
      <div className="programTop">
        <span className="programIcon">{title.charAt(0)}</span>
        <span className="badge">{badge}</span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="skillChips">
        {items.map((item) => <span key={item}>{item}</span>)}
      </div>
      <Link href={`/${slug}`} className="primaryButton">Bo‘limni ochish <span>→</span></Link>
    </article>
  );
}
