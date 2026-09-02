'use client';

import { useEffect } from 'react';
import { SPEAKING_DAYS } from '@/lib/speakingPractice';

const STORAGE_VERSION = 'v1';
type ProgressRecord = Record<string, true>;

function questionKey(day: number, topicId: string, questionNumber: number) {
  return `d${day}-${topicId}-q${questionNumber}`;
}

function readProgress(storageKey: string): ProgressRecord {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(storageKey: string, progress: ProgressRecord) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Convenience only: never block Speaking if local storage is unavailable.
  }
}

export function SpeakingProgressBridge({ studentId }: { studentId: string }) {
  useEffect(() => {
    const storageKey = `ark-speaking-progress:${STORAGE_VERSION}:${studentId}`;

    const process = () => {
      const root = document.getElementById('speaking-stage');
      if (!root) return;
      const progress = readProgress(storageKey);
      let changed = false;

      root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
        const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text.includes('Botga yuborildi')) return;
        const article = button.closest('article');
        if (!article) return;
        const label = Array.from(article.querySelectorAll('span')).find((node) => /^QUESTION\s+\d+/i.test(node.textContent || ''));
        const questionNumber = Number(label?.textContent?.match(/\d+/)?.[0] || 0);
        const heading = root.querySelector<HTMLElement>('#speaking-questions-title');
        const topicTitle = (heading?.textContent || '').trim();
        const dayNumber = Number(heading?.parentElement?.querySelector('span')?.textContent?.match(/DAY\s+(\d+)/i)?.[1] || 0);
        const day = SPEAKING_DAYS.find((item) => item.day === dayNumber);
        const topic = day?.topics.find((item) => item.title === topicTitle);
        if (!day || !topic || !questionNumber) return;
        const key = questionKey(day.day, topic.id, questionNumber);
        if (!progress[key]) {
          progress[key] = true;
          changed = true;
        }
      });

      if (changed) saveProgress(storageKey, progress);

      const topicHeading = root.querySelector<HTMLElement>('#speaking-topics-title');
      if (topicHeading) {
        const dayNumber = Number(topicHeading.parentElement?.querySelector('span')?.textContent?.match(/DAY\s+(\d+)/i)?.[1] || 0);
        const day = SPEAKING_DAYS.find((item) => item.day === dayNumber);
        if (day) {
          root.querySelectorAll<HTMLButtonElement>('button').forEach((card) => {
            const title = card.querySelector('h3')?.textContent?.trim();
            const topic = day.topics.find((item) => item.title === title);
            if (!topic) return;
            const count = topic.questions.filter((_, index) => progress[questionKey(day.day, topic.id, index + 1)]).length;
            const meta = Array.from(card.querySelectorAll('p')).find((node) => /recorded|completed/i.test(node.textContent || ''));
            if (meta) meta.textContent = `${count}/${topic.questions.length} completed`;
          });
        }
      }

      const questionHeading = root.querySelector<HTMLElement>('#speaking-questions-title');
      if (questionHeading) {
        const topicTitle = (questionHeading.textContent || '').trim();
        const dayNumber = Number(questionHeading.parentElement?.querySelector('span')?.textContent?.match(/DAY\s+(\d+)/i)?.[1] || 0);
        const day = SPEAKING_DAYS.find((item) => item.day === dayNumber);
        const topic = day?.topics.find((item) => item.title === topicTitle);
        if (day && topic) {
          root.querySelectorAll<HTMLElement>('article').forEach((article) => {
            const label = Array.from(article.querySelectorAll('span')).find((node) => /^QUESTION\s+\d+/i.test(node.textContent || ''));
            const questionNumber = Number(label?.textContent?.match(/\d+/)?.[0] || 0);
            if (questionNumber && progress[questionKey(day.day, topic.id, questionNumber)]) article.dataset.speakingCompleted = 'true';
            else delete article.dataset.speakingCompleted;
          });
        }
      }
    };

    process();
    const observer = new MutationObserver(process);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [studentId]);

  return (
    <style>{`
      #speaking-stage article[data-speaking-completed="true"]{border-color:rgba(43,139,105,.30)!important;box-shadow:0 10px 26px rgba(43,139,105,.055)!important}
      #speaking-stage article[data-speaking-completed="true"]::after{content:"✓ COMPLETED";display:inline-flex;margin:10px 0 0 auto;padding:5px 8px;border-radius:999px;background:#eaf6f0;color:#247d5f;font-size:8px;font-weight:850;letter-spacing:.08em}
    `}</style>
  );
}
