import {
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
      <div className="practiceHubPage">
        <section className="practiceHubHero">
          <div className="practiceHubEyebrow">PRACTICE HUB</div>
          <h1>Practice</h1>
          <p>Vocabulary va grammar bo‘yicha qisqa, foydali mashqlarni bir joyda bajaring.</p>
        </section>

        <section className="practiceHubSection">
          <header className="practiceHubSectionHead">
            <div>
              <small>SKILL PRACTICE</small>
              <h2>Mashq bo‘limlari</h2>
            </div>
            <span>2 ta bo‘lim</span>
          </header>

          <div className="practiceHubGrid">
            <article className="practiceHubCard practiceHubCardVocabulary">
              <div className="practiceHubCardVisual">
                <span className="practiceHubCardIcon"><BookOpenIcon /></span>
                <span className="practiceHubMiniMark">Aa</span>
              </div>
              <div className="practiceHubCardCopy">
                <small>VOCABULARY</small>
                <h3>Vocabulary Quiz</h3>
                <p>Yangi so‘zlarni test orqali mustahkamlang va vocabulary bazangizni kengaytiring.</p>
              </div>
              <div className="practiceHubCardAction">
                <span>Practice’ni ochish</span>
                <ArrowRightIcon />
              </div>
            </article>

            <article className="practiceHubCard practiceHubCardGrammar">
              <div className="practiceHubCardVisual">
                <span className="practiceHubCardIcon"><FileTextIcon /></span>
                <span className="practiceHubMiniMark">✓</span>
              </div>
              <div className="practiceHubCardCopy">
                <small>GRAMMAR</small>
                <h3>Grammar Practice</h3>
                <p>Grammar qoidalarini amaliy mashqlar orqali mustahkamlang va aniqligingizni oshiring.</p>
              </div>
              <div className="practiceHubCardAction">
                <span>Practice’ni ochish</span>
                <ArrowRightIcon />
              </div>
            </article>
          </div>
        </section>
      </div>
    </StudentWorkspaceShellClient>
  );
}
