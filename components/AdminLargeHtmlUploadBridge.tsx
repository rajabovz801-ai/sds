'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

const DIRECT_UPLOAD_THRESHOLD = 3 * 1024 * 1024;
const MAX_DIRECT_HTML_BYTES = 50 * 1024 * 1024;
const HTML_TESTS_BUCKET = 'html-tests';

type DirectAction = 'create' | 'update';

function jsonResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function field(form: FormData, key: string) {
  return String(form.get(key) || '');
}

function uploadTarget(pathname: string, method: string): { action: DirectAction; testId?: string } | null {
  if (method === 'POST' && pathname === '/api/admin/tests') return { action: 'create' };
  if (method === 'PATCH') {
    const match = pathname.match(/^\/api\/admin\/tests\/([^/]+)$/);
    if (match?.[1]) return { action: 'update', testId: decodeURIComponent(match[1]) };
  }
  return null;
}

export function AdminLargeHtmlUploadBridge() {
  useEffect(() => {
    const marker = '__arkLargeHtmlUploadBridgeInstalled';
    const globalWindow = window as typeof window & Record<string, unknown>;
    if (globalWindow[marker]) return;
    globalWindow[marker] = true;

    const nativeFetch = window.fetch.bind(window);

    const style = document.createElement('style');
    style.id = 'ark-html-drag-drop-style';
    style.textContent = `
      .dropZone[data-drag-ready="true"]{position:relative;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease,transform .18s ease}
      .dropZone[data-drag-ready="true"]:after{content:"Yoki HTML faylni shu yerga tashlang";position:absolute;right:18px;bottom:13px;font-size:10px;font-weight:800;color:#62748a;pointer-events:none}
      .dropZone[data-drag-over="true"]{border-color:#173c6c!important;background:#edf4ff!important;box-shadow:0 0 0 4px rgba(23,60,108,.10)!important;transform:translateY(-1px)}
      .dropZone[data-drag-over="true"]:after{content:"Faylni tashlang";color:#173c6c}
      @media(max-width:700px){.dropZone[data-drag-ready="true"]:after{position:static;display:block;margin:8px 0 0 62px}}
    `;
    if (!document.getElementById(style.id)) document.head.appendChild(style);

    const setupDropZone = (zone: HTMLLabelElement) => {
      const input = zone.querySelector<HTMLInputElement>('input[type="file"]');
      const hint = zone.querySelector<HTMLElement>('small');
      if (!input) return;

      if (hint && !input.files?.length && hint.textContent?.includes('maksimal 10 MB')) {
        hint.textContent = '.html yoki .htm · maksimal 50 MB';
      }

      if (zone.dataset.dragReady === 'true') return;
      zone.dataset.dragReady = 'true';

      const clearDragState = () => { zone.dataset.dragOver = 'false'; };

      zone.addEventListener('dragenter', (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.dataset.dragOver = 'true';
      });

      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        zone.dataset.dragOver = 'true';
      });

      zone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const related = event.relatedTarget as Node | null;
        if (!related || !zone.contains(related)) clearDragState();
      });

      zone.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearDragState();

        const dropped = event.dataTransfer?.files?.[0];
        if (!dropped) return;

        if (!/\.html?$/i.test(dropped.name)) {
          window.alert('Faqat .html yoki .htm fayl tashlang.');
          return;
        }
        if (dropped.size <= 0 || dropped.size > MAX_DIRECT_HTML_BYTES) {
          window.alert('HTML fayl hajmi 50 MB dan oshmasligi kerak.');
          return;
        }

        try {
          const transfer = new DataTransfer();
          transfer.items.add(dropped);
          input.files = transfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {
          window.alert('Brauzer faylni qabul qilmadi. Chrome yoki Edge’ning yangi versiyasida qayta urinib ko‘ring.');
        }
      });
    };

    const patchUploadUi = () => {
      document.querySelectorAll<HTMLLabelElement>('.dropZone').forEach(setupDropZone);
    };

    patchUploadUi();
    const observer = new MutationObserver(patchUploadUi);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const body = init?.body;

      let pathname = '';
      try {
        pathname = new URL(rawUrl, window.location.origin).pathname;
      } catch {
        return nativeFetch(input, init);
      }

      const target = uploadTarget(pathname, method);
      if (!target || !(body instanceof FormData)) {
        return nativeFetch(input, init);
      }

      const file = body.get('file');
      if (!(file instanceof File) || file.size <= DIRECT_UPLOAD_THRESHOLD) {
        return nativeFetch(input, init);
      }

      if (!/\.html?$/i.test(file.name)) {
        return jsonResponse('Faqat .html yoki .htm fayl qabul qilinadi.', 400);
      }
      if (file.size > MAX_DIRECT_HTML_BYTES) {
        return jsonResponse('HTML fayl hajmi 50 MB dan oshmasligi kerak.', 400);
      }

      try {
        const signResponse = await nativeFetch('/api/admin/tests/direct-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'sign',
            fileName: file.name,
            fileSize: file.size,
            track: field(body, 'track'),
            skill: field(body, 'skill'),
          }),
        });

        if (signResponse.status === 401) return signResponse;
        const signBody = await signResponse.json();
        if (!signResponse.ok) {
          return jsonResponse(signBody.error || 'HTML upload tayyorlanmadi.', signResponse.status);
        }

        const { filePath, token } = signBody as { filePath?: string; token?: string };
        if (!filePath || !token) {
          return jsonResponse('HTML upload tokeni olinmadi.');
        }

        const { error: uploadError } = await supabase.storage
          .from(HTML_TESTS_BUCKET)
          .uploadToSignedUrl(filePath, token, file, {
            contentType: 'text/html;charset=utf-8',
            cacheControl: '3600',
          });

        if (uploadError) {
          return jsonResponse(`HTML yuklanmadi: ${uploadError.message}`);
        }

        return nativeFetch('/api/admin/tests/direct-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: target.action,
            testId: target.testId,
            title: field(body, 'title'),
            description: field(body, 'description'),
            track: field(body, 'track'),
            skill: field(body, 'skill'),
            status: field(body, 'status'),
            durationMinutes: Number(field(body, 'durationMinutes') || 60),
            fileName: file.name,
            filePath,
            fileSize: file.size,
          }),
        });
      } catch (error) {
        return jsonResponse(error instanceof Error ? error.message : 'HTML yuklashda xatolik yuz berdi.');
      }
    };

    return () => {
      observer.disconnect();
      window.fetch = nativeFetch;
      document.getElementById('ark-html-drag-drop-style')?.remove();
      delete globalWindow[marker];
    };
  }, []);

  return null;
}
