'use client';

import { useEffect } from 'react';

const READY_TEXT = 'Botga yuborish';
const RETRY_TEXT = 'Qayta yuborish';
const FAILURE_TEXT = 'Botga yuborilmadi.';

export function SpeakingAutoSubmitBridge() {
  useEffect(() => {
    const attempts = new WeakMap<HTMLButtonElement, number>();
    const retryTimers = new WeakMap<HTMLButtonElement, number>();

    const process = () => {
      const root = document.getElementById('speaking-stage');
      if (!root) return;

      root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        const text = (button.textContent || '').replace(/\s+/g, ' ').trim();

        if (text === READY_TEXT) {
          button.hidden = true;
          button.setAttribute('aria-hidden', 'true');
          if ((attempts.get(button) || 0) === 0) {
            attempts.set(button, 1);
            window.setTimeout(() => button.click(), 0);
          }
          return;
        }

        if (text === RETRY_TEXT) {
          button.hidden = true;
          button.setAttribute('aria-hidden', 'true');
          const count = attempts.get(button) || 1;
          if (count < 2 && retryTimers.get(button) === undefined) {
            const timer = window.setTimeout(() => {
              retryTimers.delete(button);
              attempts.set(button, count + 1);
              button.click();
            }, 2200);
            retryTimers.set(button, timer);
          }
        }
      });

      root.querySelectorAll<HTMLElement>('[class*="error"]').forEach((element) => {
        const text = element.textContent || '';
        if (text.includes(FAILURE_TEXT)) {
          element.textContent = 'Javob avtomatik yuborilmadi. Internetni tekshirib, qayta Record qiling.';
        }
      });
    };

    process();
    const observer = new MutationObserver(process);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <style>{`
      #speaking-stage button[class*="sendButton"]{
        display:none!important;
      }
    `}</style>
  );
}
