'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenIcon,
  FileTextIcon,
  HeadphonesIcon,
  LibraryIcon,
  PenToolIcon,
  SearchIcon,
} from '@/components/UiIcons';
import type { CloudTest, TestSkill } from '@/lib/cloudTests';

type Filter = 'all' | 'reading' | 'listening' | 'writing' | 'speaking';

const tabs = [
  { id: 'all', label: 'All', icon: LibraryIcon },
  { id: 'reading', label: 'Reading', icon: BookOpenIcon },
  { id: 'listening', label: 'Listening', icon: HeadphonesIcon },
  { id: 'writing', label: 'Writing', icon: PenToolIcon },
] as const;

function skillLabel(skill: TestSkill) {
  return skill.replace('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export function TestsHubClient({ tests }: { tests: CloudTest[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((test) => {
      if (filter !== 'all' && test.skill !== filter) return false;
      if (!q) return true;
      return `${test.title} ${test.description} ${test.skill}`.toLowerCase().includes(q);
    });
  }, [tests, filter, query]);

  return (
    <div className="testsHub">
      <header className="testsHubHeader">
        <div>
          <span className="routeRedEyebrow">TEST LIBRARY</span>
          <h1>Tests</h1>
          <p>Choose a skill and start your next practice test.</p>
        </div>
      </header>

      <section className="testsToolbar">
        <div className="testsTabs" role="tablist" aria-label="Test skill filters">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </div>
        <label className="testsSearch">
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tests" />
        </label>
      </section>

      {visible.length ? (
        <section className="testsGrid">
          {visible.map((test) => (
            <article className="testRouteCard" key={test.id}>
              <span className="testRouteIcon"><FileTextIcon /></span>
              <div className="testRouteCopy">
                <small>{skillLabel(test.skill)}{test.testScope ? ` · ${test.testScope.replace('-', ' ')}` : ''}</small>
                <strong>{test.title}</strong>
                <p>{test.description || 'IELTS practice test'}</p>
              </div>
              <Link href={`/test/${test.id}`} prefetch>Start <span>→</span></Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="testsEmpty">
          <span><LibraryIcon /></span>
          <h2>No tests yet</h2>
          <p>New tests will appear here as soon as they are published.</p>
        </section>
      )}
    </div>
  );
}
