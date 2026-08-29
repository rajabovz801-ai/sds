'use client';

import { useEffect } from 'react';

const PATCH_ID = 'ark-mock-listening-answer-compatibility';

const PATCH_SCRIPT = `
(function () {
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    try {
      if (typeof correctAnswers === 'undefined' || !correctAnswers) {
        if (tries >= 200) clearInterval(timer);
        return;
      }

      function addAccepted(question, values) {
        var current = correctAnswers[question];
        var list = Array.isArray(current) ? current.slice() : [current];
        values.forEach(function (value) {
          if (list.indexOf(value) === -1) list.push(value);
        });
        correctAnswers[question] = list;
      }

      // Cambridge IELTS 8 Test 1 answer key allows (the/a) pianist/piano player.
      addAccepted(7, ['a pianist', 'a piano player']);
      // The numerical answer 50% is also valid when written out in words.
      addAccepted(10, ['fifty percent', 'fifty per cent']);

      clearInterval(timer);
    } catch (error) {
      if (tries >= 200) clearInterval(timer);
    }
  }, 25);
})();
`;

export function MockListeningAnswerCompatibility({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const attached = new WeakSet<HTMLIFrameElement>();
    const cleanups: Array<() => void> = [];

    const inject = (frame: HTMLIFrameElement) => {
      try {
        const doc = frame.contentDocument;
        if (!doc || doc.getElementById(PATCH_ID)) return;
        const script = doc.createElement('script');
        script.id = PATCH_ID;
        script.textContent = PATCH_SCRIPT;
        (doc.body || doc.documentElement).appendChild(script);
      } catch {}
    };

    const attach = (frame: HTMLIFrameElement) => {
      if (!frame.classList.contains('viewerFrame') || attached.has(frame)) return;
      attached.add(frame);
      const onLoad = () => {
        inject(frame);
        window.setTimeout(() => inject(frame), 80);
      };
      frame.addEventListener('load', onLoad);
      inject(frame);
      cleanups.push(() => frame.removeEventListener('load', onLoad));
    };

    document.querySelectorAll<HTMLIFrameElement>('iframe.viewerFrame').forEach(attach);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node instanceof HTMLIFrameElement) attach(node);
          node.querySelectorAll?.('iframe.viewerFrame').forEach((item) => {
            if (item instanceof HTMLIFrameElement) attach(item);
          });
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled]);

  return null;
}
