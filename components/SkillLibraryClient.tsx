import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  FileTextIcon,
  HeadphonesIcon,
  LibraryIcon,
  MicIcon,
  PenToolIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import type { CloudTest, TestSkill, TestTrack } from '@/lib/cloudTests';

const skillIcons = {
  listening: HeadphonesIcon,
  reading: BookOpenIcon,
  writing: PenToolIcon,
  speaking: MicIcon,
  'full-mock': LibraryIcon,
};

export function SkillLibraryClient({
  track,
  skill,
  title,
  description,
  tests,
}: {
  track: TestTrack;
  skill: TestSkill;
  title: string;
  description: string;
  tests: CloudTest[];
}) {
  const backHref = track === 'ielts' ? '/ielts' : '/cefr';
  const SkillIcon = skillIcons[skill];

  return (
    <div className="workspacePage libraryWorkspace">
      <Link href={backHref} className="workspaceBack"><ArrowLeftIcon /> {track.toUpperCase()} bo‘limlari</Link>
      <section className="workspaceHero workspaceHeroCompact libraryHero">
        <div className="workspaceHeroCopy">
          <span className="workspaceEyebrow"><SparklesIcon /> {track.toUpperCase()} · {skill.toUpperCase()}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="libraryHeroIcon"><SkillIcon /></div>
      </section>

      <div className="libraryHeading">
        <div><span>MAVJUD MATERIALLAR</span><h2>Test kutubxonasi</h2></div>
        <strong>{tests.length} ta material</strong>
      </div>

      {tests.length ? (
        <section className="testLibraryGrid">
          {tests.map((test, index) => (
            <article className="testLibraryCard" key={test.id}>
              <div className="testLibraryTop"><span><FileTextIcon /></span><small>TEST {String(index + 1).padStart(2, '0')}</small></div>
              <div className="testLibraryCopy"><span>{test.track.toUpperCase()} · {test.skill.toUpperCase()}</span><h3>{test.title}</h3><p>{test.description || 'Real exam formatidagi professional mock test.'}</p></div>
              <div className="testLibraryMeta"><span><ClockIcon /> Yangilangan {new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short' }).format(new Date(test.updatedAt))}</span></div>
              <Link href={`/test/${test.id}`} className="testLibraryOpen" prefetch><strong>Testni boshlash</strong><span><ArrowRightIcon /></span></Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="libraryEmpty">
          <span><LibraryIcon /></span>
          <small>CONTENT QUEUE</small>
          <h2>Yangi material tayyorlanmoqda.</h2>
          <p>Bu bo‘limga test qo‘shilishi bilan avtomatik shu yerda ko‘rinadi. Boshqa faol bo‘limni tanlab davom etishingiz mumkin.</p>
          <Link href={backHref}>Boshqa skillni tanlash <ArrowRightIcon /></Link>
        </section>
      )}
    </div>
  );
}
