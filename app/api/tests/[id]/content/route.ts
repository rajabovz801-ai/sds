import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { readAdminSession } from '@/lib/auth/admin-session';

type BridgeContext = {
  mode: string;
  attemptId: string;
  section: string;
  testId: string;
  sessionId: string;
  expiresAt: string;
  preview: boolean;
};

function injectBridge(html: string, context: BridgeContext) {
  const payload = JSON.stringify(context).replace(/</g, '\\u003c');
  const script = `
<style id="ark-secure-style">
html{font-size:16px!important}
body{font-size:16px}
.qtext,.opt,.idea-line,.headings-list,.completion-text,.left p,.right p,.right li,input,select,textarea{font-size:16px!important;line-height:1.55}
#ark-secure-hud{position:fixed;z-index:2147483600;right:14px;top:12px;height:42px;padding:0 13px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(13,29,50,.94);box-shadow:0 12px 30px rgba(0,0,0,.18);color:#fff;display:flex;align-items:center;gap:10px;font:800 13px/1 Arial,sans-serif;letter-spacing:.02em;backdrop-filter:blur(14px)}
#ark-secure-hud:before{content:"";width:8px;height:8px;border-radius:50%;background:#66d5a3;box-shadow:0 0 0 4px rgba(102,213,163,.13)}
#ark-secure-hud strong{font-variant-numeric:tabular-nums;font-size:15px}
#ark-secure-hud small{color:#9fb0c3;font-size:9px;letter-spacing:.08em}
#ark-secure-hud.ark-time-low:before{background:#ff6b58;box-shadow:0 0 0 4px rgba(255,107,88,.15)}
#deliveryStatus,.delivery-status,#restartBtn,.restart,[data-ark-delivery-success]{display:none!important}
</style>
<div id="ark-secure-hud" aria-live="polite"><small>${context.preview ? 'ADMIN PREVIEW' : 'TIME LEFT'}</small><strong id="ark-secure-time">--:--</strong></div>
<script>
(function () {
  var context = ${payload};
  var lastPayload = '';
  var expired = false;
  var platformStarted = false;
  var hud = document.getElementById('ark-secure-hud');
  var timeNode = document.getElementById('ark-secure-time');
  var nativeTimer = document.querySelector('[data-ark-timer],#timer,.timer');
  if (nativeTimer && hud) hud.style.display = 'none';

  function sendResult(payload) {
    if (!payload || typeof payload !== 'object' || context.preview) return;
    var fingerprint = '';
    try { fingerprint = JSON.stringify(payload); } catch (e) { fingerprint = String(Date.now()); }
    if (fingerprint && fingerprint === lastPayload) return;
    lastPayload = fingerprint;
    window.parent.postMessage({ type: 'ARK_TEST_RESULT', payload: payload, context: context }, '*');
  }

  function remainingSeconds() {
    return Math.max(0, Math.ceil((Date.parse(context.expiresAt) - Date.now()) / 1000));
  }

  function formatTime(total) {
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    return hours > 0
      ? String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      : String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  function syncKnownTimer() {
    var left = remainingSeconds();
    try { if (typeof secondsLeft !== 'undefined') secondsLeft = left; } catch (e) {}
    try { if (typeof deadlineAt !== 'undefined') deadlineAt = Date.parse(context.expiresAt); } catch (e) {}
  }

  function submitAtExpiry() {
    if (expired || context.preview) return;
    expired = true;
    try {
      if (typeof finalizeSubmission === 'function') { finalizeSubmission(true); return; }
    } catch (e) {}
    try {
      if (typeof buildResult === 'function') {
        var result = buildResult();
        result.timeExpired = true;
        result.details = Object.assign({}, result.details || {}, { submissionReason: 'time-expired' });
        sendResult(result);
        return;
      }
    } catch (e) {}
    try {
      if (typeof submitMock === 'function') { submitMock(true); return; }
    } catch (e) {}
    var submit = document.querySelector('[data-ark-submit],#submitBtn,.submit-btn,.submitButton');
    if (submit) {
      submit.click();
      window.setTimeout(function () {
        var confirm = document.querySelector('#confirmSubmit,[data-ark-confirm-submit],.dialog-confirm');
        if (confirm) confirm.click();
      }, 80);
      return;
    }
    sendResult({
      timeExpired: true,
      submittedAt: new Date().toISOString(),
      details: { submissionReason: 'time-expired', answers: {} }
    });
  }

  function renderTime() {
    var left = remainingSeconds();
    if (timeNode) timeNode.textContent = formatTime(left);
    if (hud) hud.classList.toggle('ark-time-low', left <= 300);
    if (left <= 0) submitAtExpiry();
  }

  function startKnownInterface() {
    if (platformStarted) return;
    platformStarted = true;
    syncKnownTimer();
    var start = document.querySelector('[data-ark-start],#startBtn,.start-button,.startBtn');
    if (start && !start.disabled) start.click();
    renderTime();
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
    if (event.data && event.data.type === 'ARK_PLATFORM_START') startKnownInterface();
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

  renderTime();
  window.setInterval(renderTime, 250);
  window.parent.postMessage({ type: 'ARK_TEST_READY', context: context }, '*');
})();
</script>`;

  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${script}</body>`);
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${script}</html>`);
  return `${html}${script}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminSession = readAdminSession(request);
    const studentSession = adminSession ? null : await readActiveStudentSession(request);
    if (!adminSession && !studentSession) {
      return new NextResponse('Student sessiyasi faol emas.', { status: 403 });
    }

    const { id } = await params;
    const service = getServiceSupabase();
    let testQuery = service
      .from('tests')
      .select('id,status,file_path,file_name,duration_minutes')
      .eq('id', id);
    const { data: test, error } = await testQuery.maybeSingle();
    if (error || !test) return new NextResponse('Test yopiq yoki topilmadi.', { status: 404 });

    let context: BridgeContext;
    if (adminSession) {
      context = {
        mode: 'preview',
        attemptId: '',
        section: String(test.status || ''),
        testId: id,
        sessionId: 'admin-preview',
        expiresAt: new Date(Date.now() + Number(test.duration_minutes || 60) * 60_000).toISOString(),
        preview: true,
      };
    } else {
      const testSessionId = request.nextUrl.searchParams.get('session') || '';
      if (!testSessionId) return new NextResponse('Avval testni platformadagi Start tugmasi orqali boshlang.', { status: 403 });

      const { data: exam, error: sessionError } = await service
        .from('test_sessions')
        .select('id,student_id,test_id,mock_attempt_id,mode,section,status,expires_at')
        .eq('id', testSessionId)
        .eq('student_id', studentSession!.studentId)
        .eq('test_id', id)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!exam || exam.status !== 'in_progress') return new NextResponse('Bu test urinishidan foydalanib bo‘lingan.', { status: 409 });
      if (new Date(exam.expires_at).getTime() <= Date.now()) {
        await service
          .from('test_sessions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', exam.id)
          .eq('status', 'in_progress');
        return new NextResponse('Test vaqti tugagan.', { status: 410 });
      }

      context = {
        mode: exam.mode,
        attemptId: exam.mock_attempt_id || '',
        section: exam.section || '',
        testId: id,
        sessionId: exam.id,
        expiresAt: exam.expires_at,
        preview: false,
      };
    }

    const { data: file, error: downloadError } = await service.storage.from(HTML_TESTS_BUCKET).download(test.file_path);
    if (downloadError || !file) throw downloadError || new Error('HTML file not found');

    const originalHtml = await file.text();
    const html = injectBridge(originalHtml, context);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${String(test.file_name || 'test.html').replace(/[\r\n"]/g, '')}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; img-src data: blob: https:; media-src data: blob: https:; font-src data: https:; connect-src 'none'; object-src 'none'; worker-src 'none'; frame-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
        'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Server error', { status: 500 });
  }
}
