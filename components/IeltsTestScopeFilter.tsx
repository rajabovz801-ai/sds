'use client';

import { useEffect } from 'react';
import type { TestScope } from '@/lib/cloudTests';

type ScopeItem = { id: string; testScope: TestScope | null };
type FilterSkill = 'listening' | 'reading';

const options: Record<FilterSkill, Array<{ value: string; label: string }>> = {
  listening: [
    { value: 'all', label: 'All parts' },
    { value: 'part-1', label: 'Part 1' },
    { value: 'part-2', label: 'Part 2' },
    { value: 'part-3', label: 'Part 3' },
    { value: 'part-4', label: 'Part 4' },
    { value: 'full-test', label: 'Full tests' },
  ],
  reading: [
    { value: 'all', label: 'All passages' },
    { value: 'passage-1', label: 'Part 1' },
    { value: 'passage-2', label: 'Part 2' },
    { value: 'passage-3', label: 'Part 3' },
    { value: 'full-test', label: 'Full tests' },
  ],
};

export function IeltsTestScopeFilter({ skill, tests }: { skill: FilterSkill; tests: ScopeItem[] }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`.sidebarLibrary-${skill}`);
    const select = root?.querySelector<HTMLSelectElement>('.libraryFilter');
    const grid = root?.querySelector<HTMLElement>('.sidebarTestGrid');
    if (!root || !select || !grid) return;

    const scopeById = new Map(tests.map((test) => [test.id, test.testScope]));
    select.innerHTML = '';
    for (const option of options[skill]) {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    }
    select.value = 'all';
    select.setAttribute('aria-label', skill === 'listening' ? 'Listening parts filter' : 'Reading passages filter');

    let empty = root.querySelector<HTMLElement>('.libraryScopeEmpty');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'libraryScopeEmpty';
      empty.textContent = 'Bu bo‘limda hozircha test yo‘q.';
      grid.insertAdjacentElement('afterend', empty);
    }

    const apply = () => {
      const selected = select.value;
      let visible = 0;
      grid.querySelectorAll<HTMLElement>('.sidebarTestCard').forEach((card) => {
        const link = card.querySelector<HTMLAnchorElement>('a[href^="/test/"]');
        const id = link?.getAttribute('href')?.split('/').filter(Boolean).pop() || '';
        const scope = scopeById.get(id) || null;
        const show = selected === 'all' || scope === selected;
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      if (empty) empty.style.display = visible ? 'none' : 'flex';
    };

    select.addEventListener('change', apply);
    apply();
    return () => {
      select.removeEventListener('change', apply);
      empty?.remove();
    };
  }, [skill, tests]);

  return (
    <style>{`
      .libraryScopeEmpty{display:none;min-height:120px;margin-top:14px;align-items:center;justify-content:center;border:1px dashed rgba(16,35,63,.15);border-radius:20px;background:rgba(255,253,248,.7);color:#78818e;font-size:12px;font-weight:700}
      .sidebarLibrary .libraryFilter{min-width:190px;font-weight:750}
    `}</style>
  );
}
