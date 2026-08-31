'use client';

import { useEffect } from 'react';

type AdminTestMeta = {
  id: string;
  title: string;
  file_name: string;
  track: string;
  skill: string;
  test_scope?: string | null;
};

const listeningOptions = [
  ['part-1', 'Part 1'],
  ['part-2', 'Part 2'],
  ['part-3', 'Part 3'],
  ['part-4', 'Part 4'],
  ['full-test', 'Full test'],
] as const;

const readingOptions = [
  ['passage-1', 'Part 1'],
  ['passage-2', 'Part 2'],
  ['passage-3', 'Part 3'],
  ['full-test', 'Full test'],
] as const;

function scopeLabel(scope?: string | null) {
  if (!scope) return '';
  if (scope === 'full-test') return 'FULL TEST';
  if (scope.startsWith('passage-')) return `PART ${scope.slice(-1)}`;
  if (scope.startsWith('part-')) return `PART ${scope.slice(-1)}`;
  return scope.toUpperCase();
}

export function AdminTestScopeBridge() {
  useEffect(() => {
    const marker = '__arkTestScopeBridgeInstalled';
    const globalWindow = window as typeof window & Record<string, unknown>;
    if (globalWindow[marker]) return;
    globalWindow[marker] = true;

    const nativeFetch = window.fetch.bind(window);
    let tests: AdminTestMeta[] = [];
    let pendingScope: string | null = null;
    let preferredScope: string | null = null;

    const currentForm = () => document.querySelector<HTMLFormElement>('.adminForm');
    const trackSelect = () => document.querySelector<HTMLSelectElement>('#admin-track');
    const skillSelect = () => document.querySelector<HTMLSelectElement>('#admin-skill');

    const ensureField = () => {
      const form = currentForm();
      const track = trackSelect();
      const skill = skillSelect();
      if (!form || !track || !skill) return;

      let field = form.querySelector<HTMLElement>('.adminTestScopeField');
      let select = form.querySelector<HTMLSelectElement>('#admin-test-scope');
      if (!field || !select) {
        field = document.createElement('div');
        field.className = 'field adminTestScopeField';
        const label = document.createElement('label');
        label.htmlFor = 'admin-test-scope';
        label.textContent = 'Test bo‘limi';
        select = document.createElement('select');
        select.id = 'admin-test-scope';
        select.setAttribute('aria-label', 'IELTS test bo‘limi');
        field.append(label, select);
        const skillRow = skill.closest('.twoFields');
        if (skillRow) skillRow.insertAdjacentElement('afterend', field);
        else form.insertBefore(field, form.firstChild);
      }

      const label = field.querySelector<HTMLLabelElement>('label');
      const isListening = track.value === 'ielts' && skill.value === 'listening';
      const isReading = track.value === 'ielts' && skill.value === 'reading';
      field.hidden = !isListening && !isReading;
      if (field.hidden) {
        select.innerHTML = '<option value="">Not applicable</option>';
        select.value = '';
        preferredScope = null;
        return;
      }

      const source = isListening ? listeningOptions : readingOptions;
      const previous = select.value;
      select.innerHTML = '';
      for (const [value, text] of source) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      }
      if (label) label.textContent = isListening ? 'Listening bo‘limi' : 'Reading bo‘limi';

      if (preferredScope !== null) {
        if (preferredScope === '') {
          const old = document.createElement('option');
          old.value = '';
          old.textContent = 'Kategoriya belgilanmagan (old test)';
          select.insertBefore(old, select.firstChild);
        }
        const values = Array.from(select.options).map((option) => option.value);
        select.value = values.includes(preferredScope) ? preferredScope : 'full-test';
        preferredScope = null;
      } else {
        const values = Array.from(select.options).map((option) => option.value);
        select.value = values.includes(previous) ? previous : 'full-test';
      }
    };

    const decorateRows = () => {
      document.querySelectorAll<HTMLElement>('.adminTestRow').forEach((row) => {
        const title = row.querySelector<HTMLElement>('h3')?.textContent?.trim() || '';
        const details = row.querySelector<HTMLElement>('.adminTestCopy small')?.textContent || '';
        const test = tests.find((item) => item.title === title && (!item.file_name || details.includes(item.file_name)));
        const meta = row.querySelector<HTMLElement>('.adminTestCopy>div');
        if (!meta) return;
        let badge = meta.querySelector<HTMLElement>('.adminScopeBadge');
        const label = scopeLabel(test?.test_scope);
        if (!label) {
          badge?.remove();
          return;
        }
        if (!badge) {
          badge = document.createElement('b');
          badge.className = 'adminScopeBadge';
          meta.appendChild(badge);
        }
        badge.textContent = label;
      });
    };

    const rememberTests = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const list = (payload as { tests?: unknown }).tests;
      if (!Array.isArray(list)) return;
      tests = list.filter((item): item is AdminTestMeta => Boolean(item && typeof item === 'object' && 'id' in item && 'title' in item)) as AdminTestMeta[];
      window.setTimeout(decorateRows, 0);
    };

    const inspectTestsResponse = (response: Response) => {
      if (!response.ok) return;
      void response.clone().json().then(rememberTests).catch(() => undefined);
    };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      let pathname = '';
      try { pathname = new URL(rawUrl, window.location.origin).pathname; } catch { return nativeFetch(input, init); }
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      let nextInit = init;

      if (pendingScope !== null && init?.body instanceof FormData && ((method === 'POST' && pathname === '/api/admin/tests') || (method === 'PATCH' && /^\/api\/admin\/tests\/[^/]+$/.test(pathname)))) {
        init.body.set('testScope', pendingScope);
        pendingScope = null;
      } else if (pendingScope !== null && pathname === '/api/admin/tests/direct-upload' && method === 'POST' && typeof init?.body === 'string') {
        try {
          const json = JSON.parse(init.body) as Record<string, unknown>;
          if (json.action === 'create' || json.action === 'update') {
            json.testScope = pendingScope;
            pendingScope = null;
            nextInit = { ...init, body: JSON.stringify(json) };
          }
        } catch {
          // Keep the original request if it is not JSON.
        }
      }

      const response = await nativeFetch(input, nextInit);
      if (method === 'GET' && pathname === '/api/admin/tests') inspectTestsResponse(response);
      return response;
    };

    const onSubmitCapture = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form?.matches('.adminForm')) return;
      const title = form.querySelector<HTMLInputElement>('#admin-title')?.value.trim() || '';
      if (!title) return;
      const editMode = form.closest('.adminFormCard')?.querySelector('h2')?.textContent?.includes('tahrirlash') || false;
      const file = form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0] || null;
      if (!editMode && !file) return;
      const select = form.querySelector<HTMLSelectElement>('#admin-test-scope');
      pendingScope = select && !select.closest<HTMLElement>('.adminTestScopeField')?.hidden ? select.value : '';
    };

    const onClickCapture = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('button[title="Tahrirlash"]');
      if (!button) return;
      const row = button.closest<HTMLElement>('.adminTestRow');
      if (!row) return;
      const title = row.querySelector<HTMLElement>('h3')?.textContent?.trim() || '';
      const details = row.querySelector<HTMLElement>('.adminTestCopy small')?.textContent || '';
      const test = tests.find((item) => item.title === title && (!item.file_name || details.includes(item.file_name)));
      preferredScope = test?.test_scope ?? '';
      window.setTimeout(ensureField, 0);
      window.setTimeout(ensureField, 80);
    };

    const onSelectChange = (event: Event) => {
      const target = event.target as HTMLSelectElement | null;
      if (target?.id === 'admin-track' || target?.id === 'admin-skill') {
        preferredScope = null;
        window.setTimeout(ensureField, 0);
      }
    };

    document.addEventListener('submit', onSubmitCapture, true);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('change', onSelectChange, true);

    const observer = new MutationObserver(() => {
      ensureField();
      decorateRows();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    ensureField();

    void nativeFetch('/api/admin/tests', { cache: 'no-store' })
      .then((response) => { inspectTestsResponse(response); return response; })
      .catch(() => undefined);

    return () => {
      observer.disconnect();
      document.removeEventListener('submit', onSubmitCapture, true);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('change', onSelectChange, true);
      window.fetch = nativeFetch;
      delete globalWindow[marker];
    };
  }, []);

  return (
    <style>{`
      .adminTestScopeField{margin-top:-2px}
      .adminTestScopeField[hidden]{display:none!important}
      .adminScopeBadge{display:inline-flex;align-items:center;min-height:20px;padding:0 7px;border:1px solid rgba(14,117,96,.15);border-radius:999px;background:#edf8f4;color:#0b7660;font-size:7px;font-weight:900;letter-spacing:.08em;white-space:nowrap}
    `}</style>
  );
}
