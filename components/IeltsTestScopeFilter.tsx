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
    const heading = root?.querySelector<HTMLElement>('.sidebarLibraryHeading');
    const headingCopy = heading?.querySelector<HTMLElement>(':scope > div');
    const headingTitle = headingCopy?.querySelector<HTMLElement>('h2');
    if (!root || !grid || !heading || !headingCopy) return;

    const scopeById = new Map(tests.map((test) => [test.id, test.testScope]));
    const oldSelectDisplay = select?.style.display || '';
    const oldTitleDisplay = headingTitle?.style.display || '';
    if (select) select.style.display = 'none';
    if (headingTitle) headingTitle.style.display = 'none';

    let tabs = headingCopy.querySelector<HTMLElement>('.ieltsScopeTabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.className = 'ieltsScopeTabs';
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', skill === 'listening' ? 'Listening parts filter' : 'Reading passages filter');
      headingCopy.appendChild(tabs);
    }

    tabs.innerHTML = '';
    let selected = 'all';

    let empty = root.querySelector<HTMLElement>('.libraryScopeEmpty');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'libraryScopeEmpty';
      empty.textContent = 'Bu bo‘limda hozircha test yo‘q.';
      grid.insertAdjacentElement('afterend', empty);
    }

    const apply = () => {
      let visible = 0;
      grid.querySelectorAll<HTMLElement>('.sidebarTestCard').forEach((card) => {
        const link = card.querySelector<HTMLAnchorElement>('a[href^="/test/"]');
        const id = link?.getAttribute('href')?.split('/').filter(Boolean).pop() || '';
        const scope = scopeById.get(id) || null;
        const show = selected === 'all' || scope === selected;
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      tabs?.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        const active = button.dataset.scope === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (empty) empty.style.display = visible ? 'none' : 'flex';
    };

    for (const option of options[skill]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scope = option.value;
      button.textContent = option.label;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        selected = option.value;
        apply();
      });
      tabs.appendChild(button);
    }

    apply();
    return () => {
      tabs?.remove();
      empty?.remove();
      if (select) select.style.display = oldSelectDisplay;
      if (headingTitle) headingTitle.style.display = oldTitleDisplay;
    };
  }, [skill, tests]);

  return (
    <style>{`
      .libraryScopeEmpty{display:none;min-height:120px;margin-top:14px;align-items:center;justify-content:center;border:1px dashed rgba(16,35,63,.15);border-radius:20px;background:rgba(255,253,248,.7);color:#78818e;font-size:12px;font-weight:700}
      .sidebarLibrary .sidebarLibraryHeading>div{width:100%;min-width:0}
      .sidebarLibrary .ieltsScopeTabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px;width:100%}
      .sidebarLibrary .ieltsScopeTabs button{height:44px;padding:0 18px;border:1px solid rgba(16,35,63,.11);border-radius:13px;background:#fffdf8;color:#52637a;font:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 6px 16px rgba(30,45,65,.025);transition:background .16s ease,color .16s ease,border-color .16s ease,transform .16s ease}
      .sidebarLibrary .ieltsScopeTabs button:hover{border-color:rgba(16,35,63,.22);transform:translateY(-1px)}
      .sidebarLibrary .ieltsScopeTabs button.active{background:#102f5b;color:#fff;border-color:#102f5b;box-shadow:0 9px 22px rgba(16,47,91,.16)}
      @media(max-width:900px){.sidebarLibrary .ieltsScopeTabs{gap:7px}.sidebarLibrary .ieltsScopeTabs button{height:41px;padding:0 14px;font-size:11px}}
      @media(max-width:620px){.sidebarLibrary .ieltsScopeTabs{flex-wrap:nowrap;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}.sidebarLibrary .ieltsScopeTabs::-webkit-scrollbar{display:none}.sidebarLibrary .ieltsScopeTabs button{flex:0 0 auto}}
    `}</style>
  );
}
