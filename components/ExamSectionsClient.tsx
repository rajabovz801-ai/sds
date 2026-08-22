'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Track = 'ielts' | 'cefr';
type Student = { id: string; firstName: string; lastName: string };

type Section = {
  key: 'listening' | 'reading' | 'writing' | 'speaking';
  title: string;
  accent: 'red' | 'blue' | 'violet';
  facts: readonly string[];
  copy: string;
  href: string;
};

const ieltsSections: readonly Section[] = [
  {
    key: 'listening',
    title: 'Listening',
    accent: 'red',
    facts: ['IELTS format', 'Audio based', 'Mock practice'],
    copy: 'IELTS Listening uchun alohida mock va video materiallar bo‘limi.',
    href: '/ielts/listening',
  },
  {
    key: 'reading',
    title: 'Reading',
    accent: 'blue',
    facts: ['IELTS format', 'Academic reading', 'Mock practice'],
    copy: 'IELTS Academic Reading uchun alohida mock va video materiallar bo‘limi.',
    href: '/ielts/reading',
  },
  {
    key: 'writing',
    title: 'Writing',
    accent: 'red',
    facts: ['Task 1', 'Task 2', 'Video lessons'],
    copy: 'IELTS Writing uchun alohida mock va video materiallar bo‘limi.',
    href: '/ielts/writing',
  },
];

const cefrSections: readonly Section[] = [
  {
    key: 'speaking',
    title: 'Speaking',
    accent: 'violet',
    facts: ['Speaking tasks', 'Level-based', 'CEFR format'],
    copy: 'CEFR Speaking uchun alohida professional practice va mock bo‘limi.',
    href: '/cefr/speaking',
  },
];

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
  const heroTitle = track === 'ielts' ? 'IELTS Mock Sections' : 'CEFR Speaking';
  const heroCopy = track === 'ielts'
    ? 'Listening, Reading va Writing bo‘limlaridan keraklisini tanlang.'
    : 'CEFR uchun hozir faqat Speaking bo‘limi faol.';

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

      <main className="examSectionMain compactSectionsMain">
        <section className="examSectionHero compactSectionsHero">
          <div>
            <span className="mockFlowEyebrow">ARK {label} MOCK EXAMINATION</span>
            <h1>{heroTitle}</h1>
            <p className="examSectionHeroCopy">{heroCopy}</p>
          </div>
          <div className="examStudentCard"><small>ACTIVE STUDENT</small><strong>{student.firstName} {student.lastName}</strong></div>
          <div className="examHeroWatermark">{label}</div>
        </section>

        <section className={`examSectionGrid compactSectionsGrid ${track === 'cefr' ? 'single' : ''}`}>
          {sections.map((section) => (
            <article className={`examSectionCard compactSectionCard ${section.accent}`} key={section.key}>
              <div className="examSectionCardTop">
                <span className="examSectionIcon">{section.title.charAt(0)}</span>
                <b>READY</b>
              </div>
              <h2>{section.title}</h2>
              <p>{section.copy}</p>
              <div className="examFacts">
                {section.facts.map((fact) => <span key={fact}><i />{fact}</span>)}
              </div>
              <Link href={section.href} className="examOpenButton">
                <strong>Open {section.title}</strong><span>→</span>
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
