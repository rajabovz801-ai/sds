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
  const script = `
<style id="ark-secure-style">
html{font-size:16px!important}
body{font-size:16px}
.qtext,.opt,.idea-line,.headings-list,.completion-text,.left p,.right p,.right li,input,select,textarea{font-size:16px!important;line-height:1.55}
#ark-secure-hud{display:none!important}
#deliveryStatus,.delivery-status,#restartBtn,.restart,[data-ark-delivery-success]{display:none!important}
</style>
<script>
(function () {
  'use strict';
  var context = ${payload};
  var lastPayload = '';
  var expired = false;
  var platformStarted = false;
  var resultSaved = false;
  var legacyAttempts = 0;
  var submitIntentAt = 0;
  var legacySubmissionId = '';
  var mutationTimer = 0;
  var candidateKey = '';
  var candidateSeen = 0;
  var candidateFirstAt = 0;

  var resultSelectors = [
    '#resultOverlay','#resultsOverlay','#resultModal','#resultsModal','#resultScreen','#resultsScreen',
    '#resultPage','#resultsPage','.result-overlay','.results-overlay','.result-modal','.results-modal',
    '.result-screen','.results-screen','.result-page','.results-page','[data-ark-result-view]',
    '[data-result-screen]','[data-result-modal]','[role="dialog"][id*="result" i]','[role="dialog"][class*="result" i]'
  ];
  var scoreSelectors = [
    '#scoreValue','#resultScore','#scoreBig','#scoreText','#finalScore','#final-score','#result-score','#score',
    '.score-value','.result-score','.score-big','.final-score','[data-ark-score]','[data-score]'
  ];
  var answeredSelectors = [
    '#answeredValue','#resultAnswered','#answeredTop','#reviewAnswered','#answeredCount',
    '.answered-value','.answered-pill','.answered-top','.answered-text','[data-ark-answered]','[data-answered]'
  ];

  function sendResult(payload) {
    if (!payload || typeof payload !== 'object' || context.preview || resultSaved) return;
    var fingerprint = '';
    try { fingerprint = JSON.stringify(payload); } catch (e) { fingerprint = String(Date.now()); }
    if (fingerprint && fingerprint === lastPayload) return;
    lastPayload = fingerprint;
    window.parent.postMessage({ type: 'ARK_TEST_RESULT', payload: payload, context: context }, '*');
  }

  function firstNode(selectors, root) {
    var host = root || document;
    for (var i = 0; i < selectors.length; i += 1) {
      try {
        var node = host.querySelector(selectors[i]);
        if (node) return node;
      } catch (e) {}
    }
    return null;
  }

  function firstVisibleNode(selectors, root) {
    var host = root || document;
    for (var i = 0; i < selectors.length; i += 1) {
      var nodes = [];
      try { nodes = host.querySelectorAll(selectors[i]); } catch (e) { nodes = []; }
      for (var n = 0; n < nodes.length; n += 1) {
        if (isVisible(nodes[n])) return nodes[n];
      }
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

  function numberFromNode(selectors, root) {
    var node = firstNode(selectors, root);
    return node ? cleanNumberText(textOf(node)) : null;
  }

  function fractionFromNode(selectors, root) {
    var node = firstNode(selectors, root);
    return node ? pairFromText(textOf(node)) : null;
  }

  function isVisible(node) {
    if (!node || !node.isConnected) return false;
    if (node.classList && node.classList.contains('hidden')) return false;
    if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return false;
    if (node.hidden) return false;
    try {
      var style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      if (node.getClientRects && node.getClientRects().length === 0) return false;
    } catch (e) {}
    return true;
  }

  function visibleResultSurface() {
    var direct = firstVisibleNode(resultSelectors);
    if (direct) return direct;

    var scoreNode = firstVisibleNode(scoreSelectors);
    if (scoreNode) {
      var ancestor = null;
      try { ancestor = scoreNode.closest('[role="dialog"],[id*="result" i],[class*="result" i]'); } catch (e) {}
      if (ancestor && isVisible(ancestor)) return ancestor;
    }

    var generic = [];
    try { generic = document.querySelectorAll('[id*="result" i],[class*="result" i]'); } catch (e) { generic = []; }
    for (var i = 0; i < generic.length; i += 1) {
      var node = generic[i];
      if (!isVisible(node)) continue;
      var text = String(node.textContent || '');
      if (/(?:score|result|correct|incorrect|unanswered|accuracy)/i.test(text) && /\\d/.test(text)) return node;
    }
    return null;
  }

  function labeledPairFromSurface(surface) {
    if (!surface) return null;
    var text = String(surface.textContent || '').replace(/,/g, '.');
    var match = text.match(/(?:score|result)\\s*[:\\-]?\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(-?\\d+(?:\\.\\d+)?)/i);
    if (!match) return null;
    var current = Number(match[1]);
    var total = Number(match[2]);
    return Number.isFinite(current) && Number.isFinite(total) && total > 0 ? [current, total] : null;
  }

  function labeledNumber(surface, labels) {
    if (!surface) return null;
    var text = String(surface.textContent || '').replace(/,/g, '.');
    for (var i = 0; i < labels.length; i += 1) {
      var re = new RegExp('(?:^|\\\\s)' + labels[i] + '\\s*[:\\-]?\\s*(-?\\d+(?:\\.\\d+)?)', 'i');
      var match = text.match(re);
      if (match) {
        var value = Number(match[1]);
        if (Number.isFinite(value)) return value;
      }
    }
    return null;
  }

  function cleanCellText(node) {
    if (!node) return '';
    var clone = node.cloneNode(true);
    var labels = clone.querySelectorAll ? clone.querySelectorAll('.label,small') : [];
    for (var i = 0; i < labels.length; i += 1) labels[i].remove();
    return String(clone.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  function captureFormAnswers() {
    var output = {};
    var controls = document.querySelectorAll('input,select,textarea');
    for (var i = 0; i < controls.length; i += 1) {
      var control = controls[i];
      var raw = String(control.name || control.id || '');
      var match = raw.match(/(?:^|[^a-z])q(?:uestion)?[-_ ]?(\\d+)/i) || raw.match(/(?:^|[^0-9])(\\d+)(?:[^0-9]|$)/);
      if (!match) continue;
      var q = Number(match[1]);
      if (!Number.isFinite(q) || q <= 0 || q > 200) continue;
      var type = String(control.type || '').toLowerCase();
      if ((type === 'radio' || type === 'checkbox') && !control.checked) continue;
      var value = String(control.value || '').trim();
      if (!value) continue;
      var key = 'q' + q;
      if (output[key] && type === 'checkbox') output[key].answer += ', ' + value;
      else output[key] = { answer: value, status: 'submitted' };
    }

    var cells = document.querySelectorAll('.clickable-cell.selected,[data-q].selected,[data-question].selected');
    for (var n = 0; n < cells.length; n += 1) {
      var cell = cells[n];
      var qRaw = cell.getAttribute('data-q') || cell.getAttribute('data-question') || '';
      var qNum = cleanNumberText(qRaw);
      if (qNum === null || qNum <= 0 || qNum > 200) continue;
      var answer = cell.getAttribute('data-letter') || cell.getAttribute('data-value') || textOf(cell);
      if (answer) output['q' + qNum] = { answer: String(answer).trim(), status: 'submitted' };
    }
    return output;
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

  function stableCandidate(key) {
    var now = Date.now();
    if (key !== candidateKey) {
      candidateKey = key;
      candidateSeen = 1;
      candidateFirstAt = now;
      return false;
    }
    candidateSeen += 1;
    return candidateSeen >= 2 && now - candidateFirstAt >= 55;
  }

  function captureLegacyResult(reason) {
    if (context.preview || resultSaved) return false;
    var surface = visibleResultSurface();
    if (!surface) return false;

    var scorePair = fractionFromNode(scoreSelectors, surface) || labeledPairFromSurface(surface);
    var answeredPair = fractionFromNode(answeredSelectors, surface) || fractionFromNode(answeredSelectors);
    var rawScore = scorePair ? scorePair[0] : numberFromNode([
      '#correctStat','#correctValue','#correctCount','#resultCorrect','.correct-value','[data-ark-correct]',
      '#scoreValue','#resultScore','#scoreBig','#scoreText','#finalScore','#final-score','#result-score','#score',
      '.score-value','.result-score','.score-big','.final-score','[data-ark-score]','[data-score]'
    ], surface);
    var maxScore = scorePair ? scorePair[1] : (answeredPair ? answeredPair[1] : numberFromNode([
      '#totalValue','#totalScore','#questionTotal','#totalQuestions','.total-value','[data-ark-max-score]','[data-max-score]','[data-total]'
    ], surface));

    if (rawScore === null) rawScore = labeledNumber(surface, ['correct','score']);
    if (maxScore === null) {
      var allPair = labeledPairFromSurface(surface);
      if (allPair) maxScore = allPair[1];
    }
    if (rawScore === null || maxScore === null || maxScore <= 0 || rawScore < 0 || rawScore > maxScore) return false;

    var unanswered = numberFromNode([
      '#unansweredValue','#emptyValue','#unansweredCount','#emptyStat','#reviewEmpty','.unanswered-value','[data-ark-unanswered]','[data-unanswered]'
    ], surface);
    var wrong = numberFromNode([
      '#wrongValue','#wrongCount','#wrongStat','#incorrectValue','#incorrectCount','.wrong-value','.incorrect-value','[data-ark-wrong]','[data-wrong]'
    ], surface);
    var answered = answeredPair ? answeredPair[0] : numberFromNode(answeredSelectors, surface);

    if (unanswered === null) unanswered = labeledNumber(surface, ['unanswered','empty']);
    if (wrong === null) wrong = labeledNumber(surface, ['incorrect','wrong']);
    if (answered === null && unanswered !== null) answered = Math.max(0, maxScore - unanswered);
    if (unanswered === null && answered !== null) unanswered = Math.max(0, maxScore - answered);
    if (wrong === null && answered !== null) wrong = Math.max(0, answered - rawScore);
    if (unanswered === null && wrong !== null) unanswered = Math.max(0, maxScore - rawScore - wrong);
    if (wrong === null && unanswered !== null) wrong = Math.max(0, maxScore - rawScore - unanswered);

    var formAnswers = captureFormAnswers();
    var reviewAnswers = captureReviewAnswers();
    var answers = Object.assign({}, formAnswers, reviewAnswers);
    var candidate = [rawScore,maxScore,wrong,unanswered,Object.keys(answers).length].join('|');
    if (!stableCandidate(candidate)) return false;

    if (!legacySubmissionId) {
      legacySubmissionId = 'legacy-' + String(context.sessionId || context.testId || 'test') + '-' + Date.now().toString(36);
    }
    var details = {
      submissionReason: reason || 'legacy-result-captured',
      submissionId: legacySubmissionId,
      bridgeVersion: 'legacy-dom-v4',
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

  function scheduleLegacyCapture(reason) {
    [0,80,180,350,650,1100,1800,2800,4200].forEach(function (delay) {
      window.setTimeout(function () { captureLegacyResult(reason); }, delay);
    });
  }

  function remainingSeconds() {
    return Math.max(0, Math.ceil((Date.parse(context.expiresAt) - Date.now()) / 1000));
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
      if (typeof finalizeSubmission === 'function') { finalizeSubmission(true); scheduleLegacyCapture('time-expired'); return; }
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
      if (typeof submitMock === 'function') { submitMock(true); scheduleLegacyCapture('time-expired'); return; }
    } catch (e) {}
    var submit = document.querySelector('[data-ark-submit],#submitBtn,.submit-btn,.submitButton');
    if (submit) {
      submit.click();
      window.setTimeout(function () {
        var confirm = document.querySelector('#confirmSubmit,[data-ark-confirm-submit],.dialog-confirm,[data-ark-submit-confirm]');
        if (confirm) confirm.click();
        scheduleLegacyCapture('time-expired');
      }, 100);
    }
  }

  function startKnownInterface() {
    if (platformStarted) return;
    platformStarted = true;
    syncKnownTimer();
    var start = document.querySelector('[data-ark-start],#startBtn,.start-button,.startBtn');
    if (start && !start.disabled) start.click();
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
      '#confirmSubmit,[data-ark-confirm-submit],.dialog-confirm,[data-ark-submit-confirm],#finishBtn,[data-ark-finish],#submitFinal,[data-submit-final]'
    ) : null;
    if (!target) return;
    submitIntentAt = Date.now();
    candidateKey = '';
    candidateSeen = 0;
    candidateFirstAt = 0;
    scheduleLegacyCapture('manual-submit');
  }, true);

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    if (event.data && event.data.type === 'ARK_RESULT_SAVED') {
      resultSaved = true;
      expired = true;
      return;
    }
    if (event.data && event.data.type === 'ARK_RESULT_ERROR') {
      lastPayload = '';
      candidateKey = '';
      candidateSeen = 0;
      candidateFirstAt = 0;
      legacyAttempts += 1;
      if (legacyAttempts < 5) scheduleLegacyCapture('retry-after-error');
    }
    if (event.data && event.data.type === 'ARK_PLATFORM_START') startKnownInterface();
  });

  if (typeof MutationObserver !== 'undefined' && document.body) {
    var observer = new MutationObserver(function () {
      if (resultSaved || !visibleResultSurface()) return;
      if (mutationTimer) window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(function () {
        captureLegacyResult('result-dom-changed');
      }, 70);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class','style','aria-hidden','hidden']
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
    if (visibleResultSurface()) captureLegacyResult('result-view-detected');
  }, 350);

  var expiryWatch = window.setInterval(function () {
    if (resultSaved) {
      window.clearInterval(expiryWatch);
      return;
    }
    if (remainingSeconds() <= 0) submitAtExpiry();
  }, 1000);

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
