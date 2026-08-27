import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  FileTextIcon,
  HeadphonesIcon,
  HelpCircleIcon,
  HomeIcon,
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

function materialLabel(skill: TestSkill) {
  if (skill === 'writing') return 'Topshiriqlar: 2';
  if (skill === 'reading' || skill === 'listening') return 'Savollar: 40';
  return 'Professional practice';
}

export function SkillLibraryClient({
  track,
  skill,
  title,
  description,
  tests,
  variant = 'default',
}: {
  track: TestTrack;
  skill: TestSkill;
  title: string;
  description: string;
  tests: CloudTest[];
  variant?: 'default' | 'sidebar';
}) {
  const backHref = track === 'ielts' ? '/ielts' : '/cefr';
  const SkillIcon = skillIcons[skill];

  if (variant === 'sidebar') {
    return (
      <div className={`workspacePage libraryWorkspace sidebarLibrary sidebarLibrary-${skill}`}>
        <nav className="libraryBreadcrumb" aria-label="Breadcrumb">
          <Link href="/mock" aria-label="Dashboard"><HomeIcon /></Link>
          <i />
          <Link href={backHref}>{track.toUpperCase()}</Link>
          <span>›</span>
          <strong>{skill.charAt(0).toUpperCase() + skill.slice(1)}</strong>
        </nav>

        <section className="workspaceHero workspaceHeroCompact libraryHero sidebarLibraryHero">
          <div className="workspaceHeroCopy">
            <span className="workspaceEyebrow"><SparklesIcon /> {track.toUpperCase()} · {skill.toUpperCase()}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={`libraryHeroIcon libraryHeroIcon-${skill}`}><SkillIcon /></div>
        </section>

        <div className="libraryHeading sidebarLibraryHeading">
          <div><span>MAVJUD MATERIALLAR</span><h2>Test kutubxonasi</h2></div>
          <select className="libraryFilter" aria-label="Material filtri" defaultValue="all">
            <option value="all">Barchasi</option>
          </select>
        </div>

        {tests.length ? (
          <section className="testLibraryGrid sidebarTestGrid">
            {tests.map((test, index) => (
              <article className="testLibraryCard sidebarTestCard" key={test.id}>
                <div className="testLibraryTop">
                  <span><FileTextIcon /></span>
                  <small>TEST {String(index + 1).padStart(2, '0')}</small>
                </div>
                <div className="testLibraryCopy">
                  <span>{test.track.toUpperCase()} · {test.skill.toUpperCase()}</span>
                  <h3>{test.title}</h3>
                  <p>{test.description || 'Haqiqiy egzamen uslubidagi professional mock test.'}</p>
                </div>
                <div className="sidebarTestMeta">
                  <span><ClockIcon /> Vaqt chegarasi: {test.durationMinutes} min</span>
                  <span><HelpCircleIcon /> {materialLabel(skill)}</span>
                </div>
                <Link href={`/test/${test.id}`} className="sidebarTestOpen" prefetch>
                  <strong>Boshlash</strong><ArrowRightIcon />
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <section className="libraryEmpty sidebarLibraryEmpty">
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
