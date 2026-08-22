import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { readSession } from '@/lib/auth/session';
import { readAdminSession } from '@/lib/auth/admin-session';

function injectBridge(html: string, context: { mode: string; attemptId: string; section: string; testId: string }) {
  const script = `
<script>
(function () {
  var context = ${JSON.stringify(context)};
  var lastPayload = '';

  function sendResult(payload) {
    if (!payload || typeof payload !== 'object') return;
    var fingerprint = '';
    try { fingerprint = JSON.stringify(payload); } catch (e) { fingerprint = String(Date.now()); }
    if (fingerprint && fingerprint === lastPayload) return;
    lastPayload = fingerprint;
    window.parent.postMessage({ type: 'ARK_TEST_RESULT', payload: payload, context: context }, '*');
  }

  window.ARK_CONTEXT = context;
  window.ARKMock = Object.assign(window.ARKMock || {}, {
    context: context,
    complete: sendResult,
    submitResult: sendResult
  });
  window.arkMockComplete = sendResult;
  window.submitArkResult = sendResult;

  document.addEventListener('ark:result', function (event) { sendResult(event.detail || {}); });
  document.addEventListener('ark-result', function (event) { sendResult(event.detail || {}); });
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    if (event.data && event.data.type === 'ARK_RESULT_ERROR') lastPayload = '';
  });

  var watch = window.setInterval(function () {
    if (window.__ARK_RESULT__ && typeof window.__ARK_RESULT__ === 'object') {
      sendResult(window.__ARK_RESULT__);
      window.clearInterval(watch);
      return;
    }
    var node = document.querySelector('[data-ark-result]');
    if (node) {
      var raw = node.getAttribute('data-ark-result');
      if (raw) {
        try { sendResult(JSON.parse(raw)); window.clearInterval(watch); } catch (e) {}
      }
    }
  }, 600);

  window.parent.postMessage({ type: 'ARK_TEST_READY', context: context }, '*');
})();
</script>`;

  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${script}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${script}</html>`);
  return `${html}${script}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!readSession(request) && !readAdminSession(request)) {
      return new NextResponse('Avval platformaga kiring.', { status: 401 });
    }
    const { id } = await params;
    const service = getServiceSupabase();
    const { data: test, error } = await service
      .from('tests')
      .select('id,status,file_path,file_name')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !test) return new NextResponse('Test not found', { status: 404 });

    const { data: file, error: downloadError } = await service.storage.from(HTML_TESTS_BUCKET).download(test.file_path);
    if (downloadError || !file) throw downloadError || new Error('HTML file not found');

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || '';
    const attemptId = url.searchParams.get('attempt') || '';
    const section = url.searchParams.get('section') || '';
    const originalHtml = await file.text();
    const html = injectBridge(originalHtml, { mode, attemptId, section, testId: id });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${String(test.file_name || 'test.html').replace(/[\r\n"]/g, '')}"`,
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Server error', { status: 500 });
  }
}
