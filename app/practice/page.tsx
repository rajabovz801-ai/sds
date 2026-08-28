import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
} from '@/components/UiIcons';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';

export default async function PracticePage() {
  const student = await requireStudent('/practice');

  return (
    <StudentWorkspaceShellClient student={student} active="practice">
      <div className="workspacePage sectionWorkspace practiceWorkspace">
        <Link href="/mock" className="workspaceBack"><ArrowLeftIcon /> Yo‘nalishlar</Link>

        <section className="workspaceHero workspaceHeroCompact">
          <div className="workspaceHeroCopy">
            <span className="workspaceEyebrow"><BookOpenIcon /> PRACTICE WORKSPACE</span>
            <h1>Practice kutubxonasi</h1>
            <p>Vocabulary va grammar bo‘yicha qisqa, foydali mashqlarni tanlang va muntazam practice qiling.</p>
          </div>
          <div className="workspaceTrackBadge">
            <small>ACTIVE TRACK</small>
            <strong>PRACTICE</strong>
            <span>2 ta bo‘lim faol</span>
          </div>
        </section>

        <section className="sectionCardGrid practiceSectionGrid">
          <article className="sectionCard sectionTone-coral">
            <div className="sectionCardTop">
              <span className="sectionCardIcon"><BookOpenIcon /></span>
              <small>01</small>
            </div>
            <div className="sectionCardCopy">
              <span>READY TO PRACTICE</span>
              <h2>Vocabulary Quiz</h2>
              <p>Yangi so‘zlarni quiz orqali mustahkamlang va vocabulary bazangizni bosqichma-bosqich kengaytiring.</p>
            </div>
            <div className="sectionFacts">
              <span><i />Vocabulary practice</span>
              <span><i />Quiz format</span>
              <span><i />Short daily drills</span>
            </div>
            <Link href="/practice/vocabulary" className="sectionOpen practiceSectionOpen">
              <strong>Vocabulary quizlar</strong>
              <span><ArrowRightIcon /></span>
            </Link>
          </article>

          <article className="sectionCard sectionTone-blue">
            <div className="sectionCardTop">
              <span className="sectionCardIcon"><FileTextIcon /></span>
              <small>02</small>
            </div>
            <div className="sectionCardCopy">
              <span>READY TO PRACTICE</span>
              <h2>Grammar Practice</h2>
              <p>Grammar qoidalarini amaliy mashqlar orqali mustahkamlang va gap tuzish aniqligingizni oshiring.</p>
            </div>
            <div className="sectionFacts">
              <span><i />Grammar drills</span>
              <span><i />Rule practice</span>
              <span><i />Accuracy building</span>
            </div>
            <div className="sectionOpen practiceSectionOpen">
              <strong>Grammar practice</strong>
              <span><ArrowRightIcon /></span>
            </div>
          </article>
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
