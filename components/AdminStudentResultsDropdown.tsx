'use client';

import { useEffect } from 'react';
import styles from './AdminStudentResultsDropdown.module.css';

export function AdminStudentResultsDropdown() {
  useEffect(() => {
    let activeHead: HTMLElement | null = null;
    let activeList: HTMLElement | null = null;
    let activeStudentKey = '';

    const setOpen = (open: boolean) => {
      if (!activeHead || !activeList) return;
      activeHead.classList.toggle(styles.open, open);
      activeList.classList.toggle(styles.collapsed, !open);
      activeHead.setAttribute('aria-expanded', String(open));
    };

    const onClick = () => {
      if (!activeHead) return;
      setOpen(activeHead.getAttribute('aria-expanded') !== 'true');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onClick();
    };

    const detach = () => {
      if (activeHead) {
        activeHead.removeEventListener('click', onClick);
        activeHead.removeEventListener('keydown', onKeyDown);
        activeHead.classList.remove(styles.toggle, styles.open);
        activeHead.removeAttribute('role');
        activeHead.removeAttribute('tabindex');
        activeHead.removeAttribute('aria-expanded');
      }
      if (activeList) activeList.classList.remove(styles.collapsed);
      activeHead = null;
      activeList = null;
    };

    const sync = () => {
      const head = document.querySelector<HTMLElement>('.adminStudentResultsHead');
      const list = document.querySelector<HTMLElement>('.adminStudentResults');
      const studentKey = document.querySelector<HTMLElement>('.adminStudentProfile h2')?.textContent?.trim() || '';

      if (!head || !list) {
        if (activeHead || activeList) detach();
        activeStudentKey = '';
        return;
      }

      if (head !== activeHead || list !== activeList) {
        detach();
        activeHead = head;
        activeList = list;
        activeHead.classList.add(styles.toggle);
        activeHead.setAttribute('role', 'button');
        activeHead.setAttribute('tabindex', '0');
        activeHead.addEventListener('click', onClick);
        activeHead.addEventListener('keydown', onKeyDown);
        activeStudentKey = studentKey;
        setOpen(false);
        return;
      }

      if (studentKey && studentKey !== activeStudentKey) {
        activeStudentKey = studentKey;
        setOpen(false);
      }
    };

    sync();
    const root = document.querySelector('.adminRoot') || document.body;
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      detach();
    };
  }, []);

  return null;
}
