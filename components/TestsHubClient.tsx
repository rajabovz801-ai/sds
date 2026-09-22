'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AwardIcon,
  BookOpenIcon,
  CheckCircleIcon,
  FileTextIcon,
  HeadphonesIcon,
} from '@/components/UiIcons';
import type { CloudTest, TestCollection, TestScope } from '@/lib/cloudTests';

type SkillTab = 'reading' | 'listening';
type PartFilter = Extract<TestScope, 'full-test' | 'passage-1' | 'passage-2' | 'passage-3' | 'part-1' | 'part-2' | 'part-3' | 'part-4'>;

const collections: Array<{ id: TestCollection; label: string; icon: typeof CheckCircleIcon }> = [
  { id: 'real-exam', label: 'Real Exam', icon: CheckCircleIcon },
  { id: 'cambridge', label: 'Cambridge', icon: BookOpenIcon },
  { id: 'gold', label: 'Gold', icon: AwardIcon },
];

const skillTabs = [
  { id: 'reading', label: 'Reading', icon: BookOpenIcon },
  { id: 'listening', label: 'Listening', icon: HeadphonesIcon },
] as const;

const readingParts: Array<{ id: PartFilter; label: string }> = [
  { id: 'full-test', label: 'Full Test' },
  { id: 'passage-1', label: '1' },
  { id: 'passage-2', label: '2' },
  { id: 'passage-3', label: '3' },
];

const listeningParts: Array<{ id: PartFilter; label: string }> = [
  { id: 'full-test', label: 'Full Test' },
  { id: 'part-1', label: '1' },
  { id: 'part-2', label: '2' },
  { id: 'part-3', label: '3' },
  { id: 'part-4', label: '4' },
];

function collectionLabel(collection: TestCollection) {
  return collections.find((item) => item.id === collection)?.label || 'Real Exam';
}

export function TestsHubClient({ tests }: { tests: CloudTest[] }) {
  const [collection, setCollection] = useState<TestCollection>('real-exam');
  const [skill, setSkill] = useState<SkillTab>('reading');
  const [part, setPart] = useState<PartFilter>('full-test');

  const partFilters = skill === 'reading' ? readingParts : listeningParts;

  const visible = useMemo(() => tests.filter((test) => {
    if (test.skill !== skill) return false;
    if ((test.testCollection || 'real-exam') !== collection) return false;
    return test.testScope === part;
  }), [tests, skill, part, collection]);

  return (
    <div className="testsHub testsReferenceLayout">
      <div className="testsModeBar" aria-label="Test collections">
        {collections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={collection === id ? 'active' : ''}
            onClick={() => {
              setCollection(id);
              setPart('full-test');
            }}
          >
            <Icon />
            <span>{label}</span>
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
                setPart('full-test');
              }}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="testsFilterArea">
          <div className="testsPartFilters" aria-label={skill === 'reading' ? 'Reading sections' : 'Listening sections'}>
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
          <h2>{collectionLabel(collection)} · {skill === 'reading' ? 'Reading' : 'Listening'}</h2>

          {visible.length ? (
            <section className="testsReferenceGrid">
              {visible.map((test) => (
                <article className="testsReferenceCard" key={test.id}>
                  <div>
                    <strong>{test.title}</strong>
                    <small>{part === 'full-test' ? 'Full Test' : skill === 'reading' ? `Reading ${part.slice(-1)}` : `Listening ${part.slice(-1)}`}</small>
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
              <small>Admin paneldan shu bo‘limga test yuklang.</small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
