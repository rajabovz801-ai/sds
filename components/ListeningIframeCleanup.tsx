'use client';

import { useEffect } from 'react';

type Props = {
  enabled: boolean;
};

const STYLE_ID = 'ark-platform-listening-cleanup';
const LOADER_STYLE_ID = 'ark-listening-loader-style';
const LOADER_ID = 'ark-listening-loader';

const CLEANUP_CSS = `
#studentModal,
.premium-start-modal,
#exam-start-overlay,
.exam-start-overlay,
#securityLock,
.security-lock,
#fullscreen-guard,
.fullscreen-guard {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
.warning-count { display: none !important; }
`;

const LOADER_CSS = `
#${LOADER_ID}{
  position:fixed;
  inset:0;
  z-index:2147483000;
  display:grid;
  place-items:center;
  padding:24px;
  background:
    radial-gradient(circle at 18% 12%,rgba(239,73,70,.10),transparent 28%),
    radial-gradient(circle at 82% 88%,rgba(16,33,61,.07),transparent 30%),
    #f7f2eb;
  opacity:1;
  visibility:visible;
  transition:opacity .22s ease,visibility .22s ease;
  font-family:Arial,Helvetica,sans-serif;
}
#${LOADER_ID}.ark-loader-ready{opacity:0;visibility:hidden;pointer-events:none}
#${LOADER_ID} .ark-loader-card{
  width:min(520px,92vw);
  border:1px solid #eadfd7;
  border-radius:28px;
  background:rgba(255,253,249,.96);
  box-shadow:0 28px 80px rgba(67,42,31,.14);
  padding:34px 34px 30px;
  color:#17120f;
  text-align:left;
}
#${LOADER_ID} .ark-loader-brand{display:flex;align-items:center;gap:13px;margin-bottom:26px}
#${LOADER_ID} .ark-loader-mark{
  width:48px;height:48px;border-radius:15px;background:#ef4946;color:#fff;
  display:grid;place-items:center;box-shadow:0 10px 24px rgba(239,73,70,.22)
}
#${LOADER_ID} .ark-loader-mark svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#${LOADER_ID} .ark-loader-brand strong{display:block;font-size:17px;letter-spacing:.2px;color:#17120f}
#${LOADER_ID} .ark-loader-brand small{display:block;margin-top:2px;font-size:10px;font-weight:800;letter-spacing:1.45px;color:#94877f}
#${LOADER_ID} .ark-loader-badge{
  display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border:1px solid #e4d9d2;
  border-radius:999px;background:#fff;color:#10213d;font-size:11px;font-weight:900;letter-spacing:1.15px
}
#${LOADER_ID} h2{margin:18px 0 9px;font-size:clamp(27px,4vw,36px);line-height:1.08;letter-spacing:-1.2px;color:#10213d}
#${LOADER_ID} p{margin:0;color:#6f655f;font-size:14px;line-height:1.6}
#${LOADER_ID} .ark-loader-progress{height:7px;margin-top:27px;border-radius:999px;background:#eee5df;overflow:hidden}
#${LOADER_ID} .ark-loader-progress span{
  display:block;width:42%;height:100%;border-radius:inherit;background:#ef4946;
  animation:arkListeningLoad 1.15s cubic-bezier(.4,0,.2,1) infinite
}
#${LOADER_ID} .ark-loader-foot{display:flex;align-items:center;gap:8px;margin-top:15px;color:#8c8079;font-size:11px;font-weight:700}
#${LOADER_ID} .ark-loader-dot{width:7px;height:7px;border-radius:50%;background:#ef4946;box-shadow:0 0 0 5px rgba(239,73,70,.10);animation:arkListeningPulse 1.1s ease-in-out infinite}
@keyframes arkListeningLoad{0%{transform:translateX(-120%)}55%{transform:translateX(95%)}100%{transform:translateX(260%)}}
@keyframes arkListeningPulse{0%,100%{opacity:.45;transform:scale(.86)}50%{opacity:1;transform:scale(1)}}
@media(max-width:560px){#${LOADER_ID}{padding:16px}#${LOADER_ID} .ark-loader-card{padding:28px 22px 25px;border-radius:23px}}
@media(prefers-reduced-motion:reduce){#${LOADER_ID} .ark-loader-progress span,#${LOADER_ID} .ark-loader-dot{animation:none}}
`;

function ensureParentStyle() {
  if (document.getElementById(LOADER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = LOADER_STYLE_ID;
  style.textContent = LOADER_CSS;
  document.head.appendChild(style);
}

function createLoader(root: HTMLElement) {
  const existing = root.querySelector<HTMLElement>(`#${LOADER_ID}`);
  if (existing) return existing;

  const loader = document.createElement('div');
  loader.id = LOADER_ID;
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  loader.innerHTML = `
    <div class="ark-loader-card">
      <div class="ark-loader-brand">
        <span class="ark-loader-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z"/><path d="M6.5 11.4v4.1c2.8 2.1 8.2 2.1 11 0v-4.1M21 9.5V15"/></svg>
        </span>
        <span><strong>ARK Education</strong><small>IELTS &amp; CEFR EXAM PLATFORM</small></span>
      </div>
      <span class="ark-loader-badge">IELTS ACADEMIC · LISTENING</span>
      <h2>Listening test tayyorlanmoqda</h2>
      <p>Audio va savollar xavfsiz yuklanmoqda. Test tayyor bo‘lishi bilan avtomatik ochiladi.</p>
      <div class="ark-loader-progress" aria-hidden="true"><span></span></div>
      <div class="ark-loader-foot"><i class="ark-loader-dot" aria-hidden="true"></i><span>Secure exam session · please wait</span></div>
    </div>`;
  root.appendChild(loader);
  return loader;
}

export function ListeningIframeCleanup({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    ensureParentStyle();

    const attached = new WeakSet<HTMLIFrameElement>();
    const cleanupFns: Array<() => void> = [];
    let currentIframe: HTMLIFrameElement | null = null;
    let revealTimer = 0;

    const inject = (iframe: HTMLIFrameElement) => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return false;
        if (doc.getElementById(STYLE_ID)) return true;
        const style = doc.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CLEANUP_CSS;
        (doc.head || doc.documentElement).appendChild(style);
        return true;
      } catch {
        return false;
      }
    };

    const reveal = (iframe: HTMLIFrameElement) => {
      if (iframe !== currentIframe) return;
      iframe.style.opacity = '1';
      iframe.style.visibility = 'visible';
      iframe.style.pointerEvents = 'auto';
      const root = iframe.closest<HTMLElement>('.viewerRoot');
      const loader = root?.querySelector<HTMLElement>(`#${LOADER_ID}`);
      if (loader) {
        loader.classList.add('ark-loader-ready');
        window.setTimeout(() => loader.remove(), 260);
      }
    };

    const scheduleReveal = (iframe: HTMLIFrameElement, delay = 150) => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => reveal(iframe), delay);
    };

    const attach = (iframe: HTMLIFrameElement) => {
      if (!iframe.classList.contains('viewerFrame') || attached.has(iframe)) return;
      attached.add(iframe);
      currentIframe = iframe;

      const root = iframe.closest<HTMLElement>('.viewerRoot');
      if (root) createLoader(root);

      iframe.style.opacity = '0';
      iframe.style.visibility = 'hidden';
      iframe.style.pointerEvents = 'none';
      iframe.style.transition = 'opacity .18s ease';

      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        if (inject(iframe) || tries >= 80) window.clearInterval(poll);
      }, 25);

      const onLoad = () => {
        inject(iframe);
        window.setTimeout(() => inject(iframe), 0);
        // Safety fallback only. Normally ARK_TEST_READY reveals the test first.
        window.clearTimeout(revealTimer);
        revealTimer = window.setTimeout(() => reveal(iframe), 5000);
      };

      iframe.addEventListener('load', onLoad);
      cleanupFns.push(() => {
        window.clearInterval(poll);
        iframe.removeEventListener('load', onLoad);
      });
    };

    const onMessage = (event: MessageEvent) => {
      const iframe = currentIframe;
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === 'ARK_TEST_READY') {
        // Give the platform bridge a brief moment to send ARK_PLATFORM_START,
        // hide the legacy start gate and begin delegated audio playback.
        scheduleReveal(iframe, 170);
      }
    };

    window.addEventListener('message', onMessage);
    document.querySelectorAll<HTMLIFrameElement>('iframe.viewerFrame').forEach(attach);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node instanceof HTMLIFrameElement) attach(node);
          node.querySelectorAll?.('iframe.viewerFrame').forEach((el) => {
            if (el instanceof HTMLIFrameElement) attach(el);
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
      window.clearTimeout(revealTimer);
      cleanupFns.forEach((fn) => fn());
      document.querySelectorAll(`#${LOADER_ID}`).forEach((node) => node.remove());
    };
  }, [enabled]);

  return null;
}
