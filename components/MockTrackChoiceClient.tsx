import Link from 'next/link';
import { ArrowRightIcon, CheckCircleIcon, GlobeIcon, LayersIcon, SparklesIcon } from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';

export function MockTrackChoiceClient({ student }: { student: StudentSummary }) {
  return (
    <div className="workspacePage mockWorkspace">
      <section className="workspaceHero">
        <div className="workspaceHeroCopy">
          <span className="workspaceEyebrow"><SparklesIcon /> PERSONAL EXAM WORKSPACE</span>
          <h1>Salom, {student.firstName}.<br /><em>Bugun nimani mashq qilamiz?</em></h1>
          <p>Yo‘nalishni tanlang — materiallar, mock testlar va keyingi natijalar bitta ravon oqimda ochiladi.</p>
        </div>
        <div className="workspaceStatusCard">
          <span><CheckCircleIcon /></span>
          <div><small>SESSION STATUS</small><strong>Profil tayyor</strong><p>Barcha natijalar profilingizda saqlanadi.</p></div>
        </div>
      </section>

      <section className="trackChoiceGrid" aria-label="Imtihon yo‘nalishlari">
        <Link href="/ielts" className="trackChoiceCard trackChoiceIelts" prefetch>
          <div className="trackChoiceTop"><span className="trackChoiceIcon"><GlobeIcon /></span><small>01 · GLOBAL STANDARD</small></div>
          <div className="trackChoiceCopy"><span>IELTS ACADEMIC</span><h2>IELTS workspace</h2><p>Listening, Reading va Writing uchun real imtihon formatidagi materiallar.</p></div>
          <div className="trackChoiceMeta"><span>3 active skills</span><span>Timed tests</span><span>Instant access</span></div>
          <div className="trackChoiceAction"><strong>IELTS’ni ochish</strong><span><ArrowRightIcon /></span></div>
        </Link>

        <Link href="/cefr" className="trackChoiceCard trackChoiceCefr" prefetch>
          <div className="trackChoiceTop"><span className="trackChoiceIcon"><LayersIcon /></span><small>02 · LEVEL BASED</small></div>
          <div className="trackChoiceCopy"><span>CEFR PATHWAY</span><h2>CEFR workspace</h2><p>A2 dan C1 gacha daraja asosidagi Speaking practice va yangi mocklar.</p></div>
          <div className="trackChoiceMeta"><span>A2–C1</span><span>Speaking active</span><span>Structured flow</span></div>
          <div className="trackChoiceAction"><strong>CEFR’ni ochish</strong><span><ArrowRightIcon /></span></div>
        </Link>
      </section>
    </div>
  );
}
