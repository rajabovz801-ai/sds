'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';

type Student = { id: string; firstName: string; lastName: string };

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12S9.7 18.5 12 21" /></svg>;
}

function LevelsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
}

export function MockTrackChoiceClient() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));
  }, []);

  if (student === undefined) {
    return <div className="mockFlowLoading">Session tekshirilmoqda…</div>;
  }

  if (!student) {
    async function resetSession() {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login?next=/mock');
      router.refresh();
    }

    return (
      <div className="mockFlowGate">
        <div className="mockFlowGateCard">
          <span>SECURE ACCESS</span>
          <h1>Avval platformaga kiring.</h1>
          <p>Session eskirgan yoki profilingiz faol emas. Yangi bir martalik kod bilan qayta kiring.</p>
          <button type="button" onClick={resetSession}>Qayta kirish →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mockFlowPage">
      <header className="mockFlowHeader">
        <Link href="/" className="mockFlowBrand">
          <span><ArkLogoIcon /></span>
          <div><strong>ARK Education</strong><small>Mock Examination Platform</small></div>
        </Link>
        <div className="mockFlowStudent"><small>ACTIVE STUDENT</small><strong>{student.firstName} {student.lastName}</strong></div>
      </header>

      <main className="mockFlowMain">
        <section className="mockFlowHero">
          <div>
            <span className="mockFlowEyebrow">ARK EDUCATION MOCK EXAMINATION</span>
            <h1>Choose your mock platform</h1>
            <p>Imtihon yo‘nalishingizni tanlang. Keyingi ekranda skill bo‘yicha mock bo‘limlar ochiladi.</p>
          </div>
          <div className="mockFlowWatermark">MOCK</div>
        </section>

        <section className="mockTrackGrid">
          <Link href="/ielts" className="mockTrackCard mockTrackIelts">
            <div className="mockTrackTop"><span>01</span><b>IELTS</b></div>
            <div className="mockTrackIcon"><GlobeIcon /></div>
            <h2>IELTS Mock Platform</h2>
            <p>Listening, Reading, Writing va Speaking bo‘yicha real exam-style mock bo‘limlar.</p>
            <div className="mockTrackFeatures"><span>4 skills</span><span>Exam timing</span><span>Professional interface</span></div>
            <div className="mockTrackOpen"><strong>Open IELTS</strong><span>→</span></div>
          </Link>

          <Link href="/cefr" className="mockTrackCard mockTrackCefr">
            <div className="mockTrackTop"><span>02</span><b>CEFR</b></div>
            <div className="mockTrackIcon"><LevelsIcon /></div>
            <h2>CEFR Mock Platform</h2>
            <p>Daraja asosidagi Listening, Reading, Writing va Speaking mock bo‘limlari.</p>
            <div className="mockTrackFeatures"><span>A2–C1</span><span>Level-based</span><span>Structured practice</span></div>
            <div className="mockTrackOpen"><strong>Open CEFR</strong><span>→</span></div>
          </Link>
        </section>
      </main>
    </div>
  );
}
