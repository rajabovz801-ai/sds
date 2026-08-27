import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { readAdminSession } from '@/lib/auth/admin-session';

type BridgeContext = {
  mode: string;
  attemptId: string;
  section: string;
  skill: string;
  testId: string;
  sessionId: string;
  expiresAt: string;
  preview: boolean;
};

function injectBridge(html: string, context: BridgeContext) {
  const payload = JSON.stringify(context).replace(/</g, '\\u003c');
  const showHud = context.skill !== 'listening';
  const hudMarkup = showHud
    ? `<div id="ark-secure-hud" aria-live="polite"><small>${context.preview ? 'ADMIN PREVIEW' : 'TIME LEFT'}</small><strong id="ark-secure-time">--:--</strong></div>`
    : '';
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
${hudMarkup}
<script>
(function () {
  var context = ${payload};
  var lastPayload = '';
  var expired = false;
  var platformStarted = false;
  var resultSaved = false;
  var legacyAttempts = 0;
  var submitIntentAt = 0;
  var legacySubmissionId = '';
  var mutationTimer = 0;
  var hud = document.getElementById('ark-secure-hud');
  var timeNode = document.getElementById('ark-secure-time');
  var nativeTimer = document.querySelector('[data-ark-timer],#timer,.timer');
  if (nativeTimer && hud) hud.style.display = 'none';

  var resultSelectors = [
    '#resultOverlay',
    '#resultsOverlay',
    '#resultModal',
    '#resultScreen',
    '#resultsScreen',
    '.result-overlay',
    '.results-overlay',
    '.result-modal',
    '.result-screen',
    '.results-screen',
    '[data-ark-result-view]'
  ];
  var scoreSelectors = [
    '#scoreValue',
    '#resultScore',
    '#scoreBig',
    '#scoreText',
    '.score-value',
    '.result-score',
    '.score-big',
    '[data-ark-score]'
  ];
  var answeredSelectors = [
    '#answeredValue',
    '#resultAnswered',
    '#answeredTop',
    '#reviewAnswered',
    '.answered-value',
    '.answered-pill',
    '.answered-top',
    '.answered-text',
    '[data-ark-answered]'
  ];

  function sendResult(payload) {
    if (!payload || typeof payload !== 'object' || context.preview || resultSaved) return;
    var fingerprint = '';
    try { fingerprint = JSON.stringify(payload); } catch (e) { fingerprint = String(Date.now()); }
    if (fingerprint && fingerprint === lastPayload) return;
    lastPayload = fingerprint;
    window.parent.postMessage({ type: 'ARK_TEST_RESULT', payload: payload, context: context }, '*');
  }

  function firstNode(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var node = document.querySelector(selectors[i]);
      if (node) return node;
    }
    return null;
  }

  function textOf(node) {
    if (!node) return '';
    var value = node.value;
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    return String(node.textContent || '').trim();
  }

  function cleanNumberText(value) {
    var match = String(value || '').replace(/,/g, '.').match(/-?\\d+(?:\\.\\d+)?/);
    if (!match) return null;
    var parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function pairFromText(value) {
    var text = String(value || '').replace(/,/g, '.');
    var match = text.match(/(-?\\d+(?:\\.\\d+)?)\\s*(?:\\/|\\bof\\b)\\s*(-?\\d+(?:\\.\\d+)?)/i);
    if (!match) return null;
    var current = Number(match[1]);
    var total = Number(match[2]);
    return Number.isFinite(current) && Number.isFinite(total) && total > 0 ? [current, total] : null;
  }

  function numberFromNode(selectors) {
    var node = firstNode(selectors);
    return node ? cleanNumberText(textOf(node)) : null;
  }

  function fractionFromNode(selectors) {
    var node = firstNode(selectors);
    return node ? pairFromText(textOf(node)) : null;
  }

  function isVisible(node) {
    if (!node) return false;
    if (node.classList && node.classList.contains('hidden')) return false;
    if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return false;
    try {
      var style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    } catch (e) {}
    return true;
  }

  function resultSurfaceVisible() {
    for (var i = 0; i < resultSelectors.length; i += 1) {
      var nodes = document.querySelectorAll(resultSelectors[i]);
      for (var n = 0; n < nodes.length; n += 1) {
        if (isVisible(nodes[n])) return true;
      }
    }
    return false;
  }

  function cleanCellText(node) {
    if (!node) return '';
    var clone = node.cloneNode(true);
    var labels = clone.querySelectorAll ? clone.querySelectorAll('.label,small') : [];
    for (var i = 0; i < labels.length; i += 1) labels[i].remove();
    return String(clone.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  function captureReviewAnswers() {
    var output = {};
    var rows = document.querySelectorAll('#reviewTable .review-row,#reviewList .review-row,.review-table .review-row,.review-list .review-row');
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var questionNode = row.querySelector('.num,[data-question-number]');
      var question = cleanNumberText(textOf(questionNode));
      if (question === null || question <= 0 || question > 200) continue;
      var cells = row.children || [];
      var statusText = String(textOf(row.querySelector('.status')) || '').toLowerCase();
      var unanswered = /unanswered|not answered|empty/.test(statusText) || row.classList.contains('unanswered');
      var correct = !unanswered && (/^correct$/.test(statusText) || row.classList.contains('correct'));
      var user = cells.length > 1 ? cleanCellText(cells[1]) : '';
      var correctAnswer = cells.length > 2 ? cleanCellText(cells[2]) : '';
      if (unanswered || /not answered/i.test(user)) user = '';
      if (/hidden/i.test(correctAnswer)) correctAnswer = '';
      output['q' + question] = {
        answer: user,
        correctAnswer: correctAnswer,
        status: unanswered ? 'unanswered' : correct ? 'correct' : 'incorrect',
        correct: correct
      };
    }
    return output;
  }

  function captureLegacyResult(reason, force) {
    if (context.preview || resultSaved) return false;
    var recentSubmit = submitIntentAt > 0 && Date.now() - submitIntentAt < 12000;
    if (!resultSurfaceVisible() && !force && !recentSubmit) return false;

    var scorePair = fractionFromNode(scoreSelectors);
    var answeredPair = fractionFromNode(answeredSelectors);
    var rawScore = scorePair ? scorePair[0] : numberFromNode([
      '#correctStat',
      '#correctValue',
      '#correctCount',
      '#resultCorrect',
      '.correct-value',
      '[data-ark-correct]',
      ...scoreSelectors
    ]);
    var maxScore = scorePair ? scorePair[1] : (answeredPair ? answeredPair[1] : numberFromNode([
      '#totalValue',
      '#totalScore',
      '#questionTotal',
      '#totalQuestions',
      '.total-value',
      '[data-ark-max-score]',
      '[data-max-score]'
    ]));

    if (rawScore === null || maxScore === null || maxScore <= 0 || rawScore < 0 || rawScore > maxScore) return false;

    var unanswered = numberFromNode([
      '#unansweredValue',
      '#emptyValue',
      '#unansweredCount',
      '#emptyStat',
      '#reviewEmpty',
      '.unanswered-value',
      '[data-ark-unanswered]'
    ]);
    var wrong = numberFromNode([
      '#wrongValue',
      '#wrongCount',
      '#wrongStat',
      '#incorrectValue',
      '#incorrectCount',
      '.wrong-value',
      '.incorrect-value',
      '[data-ark-wrong]'
    ]);
    var answered = answeredPair ? answeredPair[0] : numberFromNode(answeredSelectors);

    if (answered === null && unanswered !== null) answered = Math.max(0, maxScore - unanswered);
    if (unanswered === null && answered !== null) unanswered = Math.max(0, maxScore - answered);
    if (wrong === null && answered !== null) wrong = Math.max(0, answered - rawScore);
    if (unanswered === null && wrong !== null) unanswered = Math.max(0, maxScore - rawScore - wrong);
    if (wrong === null && unanswered !== null) wrong = Math.max(0, maxScore - rawScore - unanswered);

    if (!legacySubmissionId) {
      legacySubmissionId = 'legacy-' + String(context.sessionId || context.testId || 'test') + '-' + Date.now().toString(36);
    }
    var answers = captureReviewAnswers();
    var details = {
      submissionReason: reason || 'legacy-result-captured',
      submissionId: legacySubmissionId,
      bridgeVersion: 'legacy-dom-v3',
      capturedAt: new Date().toISOString()
    };
    if (Object.keys(answers).length) details.answers = answers;

    var result = {
      rawScore: rawScore,
      score: rawScore,
      maxScore: maxScore,
      total: maxScore,
      correct: rawScore,
      submittedAt: new Date().toISOString(),
      submissionId: legacySubmissionId,
      details: details
    };
    if (wrong !== null) result.wrong = wrong;
    if (unanswered !== null) result.unanswered = unanswered;

    sendResult(result);
    return true;
  }

  function scheduleLegacyCapture(reason, force) {
    [0, 40, 120, 300, 700, 1400, 2600].forEach(function (delay) {
      window.setTimeout(function () { captureLegacyResult(reason, Boolean(force)); }, delay);
    });
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
    if (expired || context.preview || resultSaved) return;
    expired = true;
    submitIntentAt = Date.now();
    try {
      if (typeof finalizeSubmission === 'function') { finalizeSubmission(true); scheduleLegacyCapture('time-expired', true); return; }
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
      if (typeof submitMock === 'function') { submitMock(true); scheduleLegacyCapture('time-expired', true); return; }
    } catch (e) {}
    var submit = document.querySelector('[data-ark-submit],#submitBtn,.submit-btn,.submitButton');
    if (submit) {
      submit.click();
      window.setTimeout(function () {
        var confirm = document.querySelector('#confirmSubmit,[data-ark-confirm-submit],.dialog-confirm,[data-ark-submit-confirm]');
        if (confirm) confirm.click();
        scheduleLegacyCapture('time-expired', true);
      }, 80);
      return;
    }
  }

  function renderTime() {
    if (resultSaved) return;
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
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest(
      '#confirmSubmit,[data-ark-confirm-submit],.dialog-confirm,[data-ark-submit-confirm],#finishBtn,[data-ark-finish]'
    ) : null;
    if (!target) return;
    submitIntentAt = Date.now();
    scheduleLegacyCapture('manual-submit', true);
  });

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    if (event.data && event.data.type === 'ARK_RESULT_SAVED') {
      resultSaved = true;
      expired = true;
      if (hud) hud.style.display = 'none';
      return;
    }
    if (event.data && event.data.type === 'ARK_RESULT_ERROR') {
      lastPayload = '';
      legacyAttempts += 1;
      if (legacyAttempts < 4) scheduleLegacyCapture('retry-after-error', true);
    }
    if (event.data && event.data.type === 'ARK_PLATFORM_START') startKnownInterface();
  });

  if (typeof MutationObserver !== 'undefined' && document.body) {
    var observer = new MutationObserver(function () {
      if (resultSaved) return;
      if (!resultSurfaceVisible() && !(submitIntentAt && Date.now() - submitIntentAt < 12000)) return;
      if (mutationTimer) window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(function () {
        captureLegacyResult('result-dom-changed', false);
      }, 45);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
  }

  var watch = window.setInterval(function () {
    if (resultSaved) {
      window.clearInterval(watch);
      return;
    }
    if (window.__ARK_RESULT__ && typeof window.__ARK_RESULT__ === 'object') {
      sendResult(window.__ARK_RESULT__);
      return;
    }
    var node = document.querySelector('[data-ark-result]');
    if (node) {
      var raw = node.getAttribute('data-ark-result');
      if (raw) {
        try { sendResult(JSON.parse(raw)); return; } catch (e) {}
      }
    }
    captureLegacyResult('result-view-detected', false);
  }, 500);

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
    const testQuery = service
      .from('tests')
      .select('id,status,skill,file_path,file_name,duration_minutes')
      .eq('id', id);
    const { data: test, error } = await testQuery.maybeSingle();
    if (error || !test) return new NextResponse('Test yopiq yoki topilmadi.', { status: 404 });

    let context: BridgeContext;
    if (adminSession) {
      context = {
        mode: 'preview',
        attemptId: '',
        section: String(test.status || ''),
        skill: String(test.skill || ''),
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
        .select('id,student_id,test_id,mock_attempt_id,mode,section,status,expires_at,superseded')
        .eq('id', testSessionId)
        .eq('student_id', studentSession!.studentId)
        .eq('test_id', id)
        .eq('superseded', false)
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
        skill: String(test.skill || exam.section || ''),
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
