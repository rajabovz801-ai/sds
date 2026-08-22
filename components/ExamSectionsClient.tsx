import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  HeadphonesIcon,
  MicIcon,
  PenToolIcon,
  SparklesIcon,
} from '@/components/UiIcons';

type Track = 'ielts' | 'cefr';
type SectionKey = 'listening' | 'reading' | 'writing' | 'speaking';

type Section = {
  key: SectionKey;
  title: string;
  tone: 'coral' | 'blue' | 'violet';
  facts: readonly string[];
  copy: string;
  href: string;
};

const sectionIcons = {
  listening: HeadphonesIcon,
  reading: BookOpenIcon,
  writing: PenToolIcon,
  speaking: MicIcon,
};

const ieltsSections: readonly Section[] = [
  { key: 'listening', title: 'Listening', tone: 'coral', facts: ['IELTS format', 'Audio based', 'Timed practice'], copy: 'Audio, savollar va real vaqt nazorati bilan IELTS Listening mocklari.', href: '/ielts/listening' },
  { key: 'reading', title: 'Reading', tone: 'blue', facts: ['Academic texts', '40 questions', 'Live timer'], copy: 'Academic passage va savollar bilan to‘liq Reading ish maydoni.', href: '/ielts/reading' },
  { key: 'writing', title: 'Writing', tone: 'violet', facts: ['Task 1', 'Task 2', 'Guided practice'], copy: 'Writing topshiriqlari, namunalar va keyingi feedback oqimi.', href: '/ielts/writing' },
];

const cefrSections: readonly Section[] = [
  { key: 'speaking', title: 'Speaking', tone: 'violet', facts: ['Level based', 'Speaking tasks', 'CEFR format'], copy: 'Daraja asosidagi professional speaking practice va mock topshiriqlari.', href: '/cefr/speaking' },
];

export function ExamSectionsClient({ track }: { track: Track }) {
  const sections = track === 'ielts' ? ieltsSections : cefrSections;
  const label = track.toUpperCase();
  const title = track === 'ielts' ? 'IELTS skill kutubxonasi' : 'CEFR skill kutubxonasi';

  return (
    <div className="workspacePage sectionWorkspace">
      <Link href="/mock" className="workspaceBack"><ArrowLeftIcon /> Yo‘nalishlar</Link>
      <section className="workspaceHero workspaceHeroCompact">
        <div className="workspaceHeroCopy">
          <span className="workspaceEyebrow"><SparklesIcon /> {label} EXAM WORKSPACE</span>
          <h1>{title}</h1>
          <p>{track === 'ielts' ? 'Kerakli skillni tanlang va mavjud mock testlarni darhol boshlang.' : 'Faol bo‘limni tanlang; yangi skilllar tayyor bo‘lganda shu yerda ochiladi.'}</p>
        </div>
        <div className="workspaceTrackBadge"><small>ACTIVE TRACK</small><strong>{label}</strong><span>{sections.length} ta bo‘lim faol</span></div>
      </section>

      <section className={`sectionCardGrid ${sections.length === 1 ? 'sectionCardGridSingle' : ''}`}>
        {sections.map((section, index) => {
          const Icon = sectionIcons[section.key];
          return (
            <article className={`sectionCard sectionTone-${section.tone}`} key={section.key}>
              <div className="sectionCardTop"><span className="sectionCardIcon"><Icon /></span><small>0{index + 1}</small></div>
              <div className="sectionCardCopy"><span>READY TO PRACTICE</span><h2>{section.title}</h2><p>{section.copy}</p></div>
              <div className="sectionFacts">{section.facts.map((fact) => <span key={fact}><i />{fact}</span>)}</div>
              <Link href={section.href} className="sectionOpen" prefetch><strong>{section.title}’ni ochish</strong><span><ArrowRightIcon /></span></Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
