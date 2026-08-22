'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Track = 'ielts' | 'cefr';
type Student = { id: string; firstName: string; lastName: string };

const ieltsSections = [
  { key: 'listening', title: 'Listening', accent: 'red', facts: ['40 ta savol', '30 daqiqa', '4 ta bo‘lim'], copy: 'Audio materiallar va IELTS formatidagi to‘liq listening testlari.' },
  { key: 'reading', title: 'Reading', accent: 'blue', facts: ['40 ta savol', '60 daqiqa', '3 ta passage'], copy: 'Akademik matnlar, real test savollari va uchta reading passage.' },
  { key: 'writing', title: 'Writing', accent: 'red', facts: ['2 ta topshiriq', '60 daqiqa', 'Task 1 va Task 2'], copy: 'Writing Task 1 va Task 2 uchun professional imtihon muhiti.' },
  { key: 'speaking', title: 'Speaking', accent: 'violet', facts: ['3 ta part', '11–14 daqiqa', 'Part 1, 2 va 3'], copy: 'Speaking Part 1–3 uchun tartibli va exam-style practice muhiti.' },
] as const;

const cefrSections = [
  { key: 'listening', title: 'Listening', accent: 'red', facts: ['Level-based', 'Audio tasks', 'A2–C1'], copy: 'CEFR darajalari bo‘yicha listening topshiriqlari va mock materiallar.' },
  { key: 'reading', title: 'Reading', accent: 'blue', facts: ['Level-based', 'Reading tasks', 'A2–C1'], copy: 'Darajaga mos matnlar va CEFR formatidagi reading savollari.' },
  { key: 'writing', title: 'Writing', accent: 'red', facts: ['Structured tasks', 'Level-based', 'A2–C1'], copy: 'CEFR yozma topshiriqlari uchun professional practice muhiti.' },
  { key: 'speaking', title: 'Speaking', accent: 'violet', facts: ['Speaking tasks', 'Level-based', 'A2–C1'], copy: 'CEFR speaking topshiriqlari va tartibli practice flow.' },
] as const;

export function ExamSectionsClient({ track }: { track: Track }) {
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));
  }, []);

  if (student === undefined) return <div className="mockFlowLoading">Session tekshirilmoqda…</div>;

  if (!student) {
    return (
      <div className="mockFlowGate">
        <div className="mockFlowGateCard">
          <span>SECURE ACCESS</span>
          <h1>Session topilmadi.</h1>
          <p>Telegram bot bergan kod bilan avval platformaga kiring.</p>
          <Link href="/">Bosh sahifaga qaytish →</Link>
        </div>
      </div>
    );
  }

  const sections = track === 'ielts' ? ieltsSections : cefrSections;
  const label = track.toUpperCase();

  return (
    <div className="examSectionPage">
      <header className="examSectionHeader">
        <Link href="/" className="mockFlowBrand">
          <span>A</span>
          <div><strong>ARK Education</strong><small>{label} Mock Platform</small></div>
        </Link>
        <div className="examHeaderActions">
          <Link href="/mock" className="examBack">← Yo‘nalishlar</Link>
          <Link href="/" className="examExit">CHIQISH</Link>
        </div>
      </header>

      <main className="examSectionMain">
        <section className="examSectionHero">
          <div>
            <span className="mockFlowEyebrow">ARK {label} MOCK EXAMINATION</span>
            <h1>Choose your exam section</h1>
          </div>
          <div className="examStudentCard"><small>ACTIVE STUDENT</small><strong>{student.firstName} {student.lastName}</strong></div>
          <div className="examHeroWatermark">{label}</div>
        </section>

        <section className="examSectionGrid">
          {sections.map((section) => (
            <article className={`examSectionCard ${section.accent}`} key={section.key}>
              <div className="examSectionCardTop">
                <span className="examSectionIcon">{section.title.charAt(0)}</span>
                <b>READY</b>
              </div>
              <h2>{section.title}</h2>
              <p>{section.copy}</p>
              <div className="examFacts">
                {section.facts.map((fact) => <span key={fact}><i />{fact}</span>)}
              </div>
              <Link href={`/dashboard?track=${track}&skill=${section.key}`} className="examOpenButton">
                <strong>Open {section.title}</strong><span>→</span>
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
