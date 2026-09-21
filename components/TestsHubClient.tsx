'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AwardIcon,
  BookOpenIcon,
  CheckCircleIcon,
  FileTextIcon,
  HeadphonesIcon,
  MicIcon,
  SearchIcon,
} from '@/components/UiIcons';
import type { CloudTest, TestSkill } from '@/lib/cloudTests';

type SkillTab = 'reading' | 'listening';
type PartFilter = 'all' | 'full' | 'part-1' | 'part-2' | 'part-3';

const modeChips = [
  { id: 'real-exam', label: 'Real-Exam', icon: CheckCircleIcon, active: true, badge: null },
  { id: 'cambridge', label: 'Cambridge', icon: BookOpenIcon, active: false, badge: null },
  { id: 'gold', label: 'Gold', icon: AwardIcon, active: false, badge: null },
  { id: 'mock', label: 'Mock', icon: FileTextIcon, active: false, badge: 'SOON' },
  { id: 'speaking', label: 'Speaking', icon: MicIcon, active: false, badge: 'NEW' },
] as const;

const skillTabs = [
  { id: 'reading', label: 'Reading', icon: BookOpenIcon },
  { id: 'listening', label: 'Listening', icon: HeadphonesIcon },
] as const;

const partFilters: Array<{ id: PartFilter; label: string }> = [
  { id: 'all', label: 'Full Test' },
  { id: 'part-1', label: 'Part 1' },
  { id: 'part-2', label: 'Part 2' },
  { id: 'part-3', label: 'Part 3' },
];

function skillLabel(skill: TestSkill) {
  return skill.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function TestsHubClient({ tests }: { tests: CloudTest[] }) {
  const [skill, setSkill] = useState<SkillTab>('reading');
  const [part, setPart] = useState<PartFilter>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return tests.filter((test) => {
      if (test.skill !== skill) return false;

      if (part !== 'all') {
        const scope = String(test.testScope || '').toLowerCase();
        if (scope !== part) return false;
      }

      if (!q) return true;
      return `${test.title} ${test.description} ${test.skill}`.toLowerCase().includes(q);
    });
  }, [tests, skill, part, query]);

  return (
    <div className="testsHub testsReferenceLayout">
      <div className="testsModeBar" aria-label="Test collections">
        {modeChips.map(({ id, label, icon: Icon, active, badge }) => (
          <button key={id} type="button" className={active ? 'active' : ''}>
            <Icon />
            <span>{label}</span>
            {badge && <small className={badge === 'NEW' ? 'new' : ''}>{badge}</small>}
          </button>
        ))}
      </div>

      <section className="testsReferencePanel">
        <div className="testsSkillTabs" role="tablist" aria-label="Test skill">
          {skillTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={skill === id}
              className={skill === id ? 'active' : ''}
              onClick={() => {
                setSkill(id);
                setPart('all');
              }}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="testsFilterArea">
          <div className="testsFilterRow">
            <label className="testsReferenceSearch">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions by title and press Enter"
              />
            </label>

            <select className="testsReferenceSelect" aria-label="Exam type" defaultValue="real-exam">
              <option value="real-exam">Real Exam</option>
            </select>

            <select className="testsReferenceSelect" aria-label="Difficulty" defaultValue="difficulty">
              <option value="difficulty">Difficulty</option>
            </select>
          </div>

          <div className="testsPartFilters" aria-label="Test parts">
            {partFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={part === item.id ? 'active' : ''}
                onClick={() => setPart(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="testsReferenceContent">
          <h2>{skill === 'reading' ? 'Reading Question Sets' : 'Listening Question Sets'}</h2>

          {visible.length ? (
            <section className="testsReferenceGrid">
              {visible.map((test) => (
                <article className="testsReferenceCard" key={test.id}>
                  <div>
                    <strong>{test.title}</strong>
                    <small>{test.testScope ? test.testScope.replace('-', ' ') : skillLabel(test.skill)}</small>
                  </div>
                  <Link href={`/test/${test.id}`} prefetch>
                    Start
                  </Link>
                </article>
              ))}
            </section>
          ) : (
            <div className="testsReferenceBlank">
              <span><FileTextIcon /></span>
              <strong>No tests yet</strong>
              <small>New tests will appear here when they are published.</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
