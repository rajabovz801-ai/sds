'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CloudTest, TestSkill, TestTrack } from '@/lib/cloudTests';

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
  const [tests, setTests] = useState<CloudTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));

    fetch('/api/public-tests')
      .then((r) => r.json())
      .then((data) => setTests(data.tests || []))
      .catch(() => setTests([]))
      .finally(() => setLoadingTests(false));
  }, []);

  const filtered = useMemo(
    () => tests.filter((test) => test.status === 'published' && test.track === track && test.skill === skill),
    [tests, track, skill],
  );

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
    <div className="examSectionPage skillLibraryPage">
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

      <main className="skillLibraryMain">
        <section className="skillLibraryHero">
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

        <section className="skillLibraryList">
          <div className="skillLibraryHeading">
            <div>
              <span>AVAILABLE TESTS</span>
              <h2>{title}</h2>
            </div>
            <b>{filtered.length} ta test</b>
          </div>

          {loadingTests ? (
            <div className="skillLibraryEmpty">Testlar yuklanmoqda…</div>
          ) : filtered.length === 0 ? (
            <div className="skillLibraryEmpty">
              <strong>Hozircha test joylanmagan.</strong>
              <p>Bu bo‘lim tayyor. Testlar qo‘shilganda shu yerda avtomatik chiqadi.</p>
            </div>
          ) : (
            <div className="skillLibraryCards">
              {filtered.map((test, index) => (
                <Link href={`/test/${test.id}`} className="skillTestCard" key={test.id}>
                  <span className="skillTestNumber">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <small>{track.toUpperCase()} · {skill.toUpperCase()}</small>
                    <h3>{test.title}</h3>
                    {test.description && <p>{test.description}</p>}
                  </div>
                  <span className="skillTestOpen">OPEN →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
