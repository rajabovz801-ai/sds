'use client';

import { useEffect } from 'react';

function setSelectValue(select: HTMLSelectElement, value: string) {
  if (select.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function setInputValue(input: HTMLInputElement, value: string) {
  if (input.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function AdminResultsFilterFix() {
  useEffect(() => {
    const applyDefaults = () => {
      const overlay = document.querySelector<HTMLElement>('[aria-label="Admin natijalar boshqaruvi"]');
      if (!overlay || overlay.dataset.resultsFilterReady === 'true') return;

      const filters = overlay.querySelectorAll<HTMLSelectElement>('select');
      if (filters.length < 4) return;

      overlay.dataset.resultsFilterReady = 'true';
      const search = overlay.querySelector<HTMLInputElement>('input[placeholder*="Student"]');
      if (search) setInputValue(search, '');

      // Natijalar markazi har ochilganda foydali holatdan boshlanadi:
      // barcha vaqt + barcha yo'nalish + barcha skill + completed.
      setSelectValue(filters[0], 'all');
      setSelectValue(filters[1], 'all');
      setSelectValue(filters[2], 'all');
      setSelectValue(filters[3], 'completed');
    };

    applyDefaults();
    const observer = new MutationObserver(applyDefaults);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style>{`
      [aria-label="Admin natijalar boshqaruvi"] table tbody td:first-child b {
        font-size: 14px !important;
        line-height: 1.25 !important;
        font-weight: 900 !important;
      }
      [aria-label="Admin natijalar boshqaruvi"] table tbody td:nth-child(2) b {
        font-size: 12px !important;
        line-height: 1.3 !important;
        font-weight: 850 !important;
      }
      [aria-label="Admin natijalar boshqaruvi"] table tbody td {
        font-size: 11.5px !important;
      }
      [aria-label="Admin natijalar boshqaruvi"] select {
        cursor: pointer !important;
      }
    `}</style>
  );
}
