'use client';

import { useEffect } from 'react';

export function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (reduceMotion) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    root.classList.add('motion-ready');

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
      );
    }

    elements.forEach((el) => {
      if (observer) observer.observe(el);
      else el.classList.add('is-visible');
    });

    const preview = document.querySelector<HTMLElement>('[data-tilt]');
    const onPointerMove = (event: PointerEvent) => {
      if (!preview || window.innerWidth < 980) return;
      const rect = preview.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      preview.style.setProperty('--tilt-x', `${(x * 2.2).toFixed(2)}deg`);
      preview.style.setProperty('--tilt-y', `${(y * -1.8).toFixed(2)}deg`);
    };

    const resetTilt = () => {
      if (!preview) return;
      preview.style.setProperty('--tilt-x', '0deg');
      preview.style.setProperty('--tilt-y', '0deg');
    };

    preview?.addEventListener('pointermove', onPointerMove);
    preview?.addEventListener('pointerleave', resetTilt);

    return () => {
      observer?.disconnect();
      preview?.removeEventListener('pointermove', onPointerMove);
      preview?.removeEventListener('pointerleave', resetTilt);
      root.classList.remove('motion-ready');
    };
  }, []);

  return null;
}
