'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TestSkill, TestTrack } from '@/lib/cloudTests';

type Student = { firstName: string; lastName: string };

export function SkillLibraryClient({
  track,
  skill,
  title,
  description,
}: {
  track: TestTrack;
  skill: TestSkill;
  title: string;
  description: string;
}) {
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

  const backHref = track === 'ielts' ? '/ielts' : '/cefr';

  return (
    <div className="examSectionPage skillWorkspacePage">
      <header className="examSectionHeader">
        <Link href="/" className="mockFlowBrand">
          <span>A</span>
          <div><strong>ARK Education</strong><small>{track.toUpperCase()} Mock Platform</small></div>
        </Link>
        <div className="examHeaderActions">
          <Link href={backHref} className="examBack">← Orqaga</Link>
          <Link href="/mock" className="examExit">YO‘NALISHLAR</Link>
        </div>
      </header>

      <main className="skillWorkspaceMain">
        <section className="skillWorkspaceHero">
          <div>
            <span className="mockFlowEyebrow">{track.toUpperCase()} · {skill.toUpperCase()}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="examStudentCard skillStudentCard">
            <small>ACTIVE STUDENT</small>
            <strong>{student.firstName} {student.lastName}</strong>
          </div>
        </section>

        <section className="skillWorkspaceEmpty">
          <span className="skillWorkspaceBadge">SECTION READY</span>
          <h2>{title} materiallari shu yerga qo‘shiladi.</h2>
          <p>Eski testlar bu bo‘limdan olib tashlandi. Keyingi bosqichda yangi mocklar va video materiallarni shu yerga ulaymiz.</p>
        </section>
      </main>
    </div>
  );
}
