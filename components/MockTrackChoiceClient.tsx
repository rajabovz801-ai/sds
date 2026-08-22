'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Student = { id: string; firstName: string; lastName: string };

export function MockTrackChoiceClient() {
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
    return (
      <div className="mockFlowGate">
        <div className="mockFlowGateCard">
          <span>SECURE ACCESS</span>
          <h1>Avval platformaga kiring.</h1>
          <p>Telegram botdan olingan bir martalik kodni bosh sahifada kiriting.</p>
          <Link href="/">Bosh sahifaga qaytish →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mockFlowPage">
      <header className="mockFlowHeader">
        <Link href="/" className="mockFlowBrand">
          <span>A</span>
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
            <div className="mockTrackIcon">I</div>
            <h2>IELTS Mock Platform</h2>
            <p>Listening, Reading, Writing va Speaking bo‘yicha real exam-style mock bo‘limlar.</p>
            <div className="mockTrackFeatures"><span>4 skills</span><span>Exam timing</span><span>Professional interface</span></div>
            <div className="mockTrackOpen"><strong>Open IELTS</strong><span>→</span></div>
          </Link>

          <Link href="/cefr" className="mockTrackCard mockTrackCefr">
            <div className="mockTrackTop"><span>02</span><b>CEFR</b></div>
            <div className="mockTrackIcon">C</div>
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
