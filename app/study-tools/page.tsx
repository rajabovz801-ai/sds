import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HeadphonesIcon,
  PenToolIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function StudyToolsPage() {
  const student = await requireStudent('/study-tools');

  return (
    <StudentWorkspaceShellClient student={student} active="tools">
      <div className="workspacePage sectionWorkspace practiceWorkspace">
        <Link href="/mock" className="workspaceBack"><ArrowLeftIcon /> Yo‘nalishlar</Link>

        <section className="workspaceHero workspaceHeroCompact">
          <div className="workspaceHeroCopy">
            <span className="workspaceEyebrow"><SparklesIcon /> STUDY TOOLS WORKSPACE</span>
            <h1>Tools kutubxonasi</h1>
            <p>Typing va shadowing orqali tezlik, aniqlik, listening hamda pronunciation ko‘nikmalaringizni muntazam rivojlantiring.</p>
          </div>
          <div className="workspaceTrackBadge">
            <small>ACTIVE TRACK</small>
            <strong>TOOLS</strong>
            <span>2 ta bo‘lim faol</span>
          </div>
        </section>

        <section className="sectionCardGrid practiceSectionGrid">
          <article className="sectionCard sectionTone-blue">
            <div className="sectionCardTop">
              <span className="sectionCardIcon"><PenToolIcon /></span>
              <small>01</small>
            </div>
            <div className="sectionCardCopy">
              <span>READY TO PRACTICE</span>
              <h2>Typing Practice</h2>
              <p>Inglizcha matnlarni tez va xatosiz yozish orqali typing speed, spelling va diqqatni bosqichma-bosqich oshiring.</p>
            </div>
            <div className="sectionFacts">
              <span><i />Typing speed</span>
              <span><i />Accuracy practice</span>
              <span><i />Spelling focus</span>
            </div>
            <Link href="/study-tools/typing" className="sectionOpen practiceSectionOpen">
              <strong>Typing practice</strong>
              <span><ArrowRightIcon /></span>
            </Link>
          </article>

          <article className="sectionCard sectionTone-violet">
            <div className="sectionCardTop">
              <span className="sectionCardIcon"><HeadphonesIcon /></span>
              <small>02</small>
            </div>
            <div className="sectionCardCopy">
              <span>READY TO PRACTICE</span>
              <h2>Shadowing Practice</h2>
              <p>Audio ortidan bir vaqtda takrorlash orqali listening, pronunciation, rhythm va natural fluency ko‘nikmalaringizni kuchaytiring.</p>
            </div>
            <div className="sectionFacts">
              <span><i />Pronunciation</span>
              <span><i />Listening rhythm</span>
              <span><i />Fluency building</span>
            </div>
            <Link href="/study-tools/shadowing" className="sectionOpen practiceSectionOpen">
              <strong>Shadowing practice</strong>
              <span><ArrowRightIcon /></span>
            </Link>
          </article>
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
