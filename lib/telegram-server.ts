import 'server-only';

type AnswerDetail = {
  answer?: unknown;
  correctAnswer?: unknown;
  status?: unknown;
  correct?: unknown;
};

type GatewayAnswer = {
  question: number;
  answer: string;
  correct_answer: string;
  status: 'correct' | 'incorrect' | 'unanswered';
  correct: boolean;
};

type GatewayBreakdown = {
  name: string;
  start_question: number;
  end_question: number;
  correct: number;
  total: number;
};

type GatewayResponse = Record<string, unknown>;

export type AdminTestResult = {
  student: {
    firstName?: string;
    lastName?: string;
    telegramId?: string | number | null;
  };
  testTitle: string;
  track?: string;
  section?: string;
  rawScore?: number | null;
  maxScore?: number | null;
  band?: number | null;
  correct?: number | null;
  wrong?: number | null;
  unanswered?: number | null;
  durationSeconds?: number | null;
  submittedAt?: string | null;
  details?: Record<string, unknown>;
};

export type TelegramDelivery = {
  configured: boolean;
  recipients: number;
  sent: number;
  failed: number;
  status?: number;
  reference?: string;
  error?: string;
};

const MAX_ANSWER_LENGTH = 500;

function cleanText(value: unknown, max = 180) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function answerRows(details: Record<string, unknown> | undefined): GatewayAnswer[] {
  const raw = details?.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  return Object.entries(raw as Record<string, AnswerDetail>)
    .map(([key, value]) => {
      const question = Number(String(key).replace(/\D/g, ''));
      const detail = value && typeof value === 'object' ? value : {};
      const answer = cleanText(detail.answer, MAX_ANSWER_LENGTH);
      const correctAnswer = cleanText(detail.correctAnswer, MAX_ANSWER_LENGTH);
      const rawStatus = cleanText(detail.status, 20).toLowerCase();
      const correct = detail.correct === true || rawStatus === 'correct';
      const status: GatewayAnswer['status'] = !answer || rawStatus === 'unanswered'
        ? 'unanswered'
        : correct ? 'correct' : 'incorrect';

      return {
        question,
        answer,
        correct_answer: correctAnswer,
        status,
        correct,
      };
    })
    .filter((item) => Number.isInteger(item.question) && item.question > 0 && item.question <= 200)
    .sort((a, b) => a.question - b.question);
}

function formatAnswers(rows: GatewayAnswer[]) {
  return rows.map((item) => {
    if (item.status === 'unanswered') return `${item.question}. — | unanswered`;
    if (item.correct) return `${item.question}. ${item.answer} | correct`;
    return `${item.question}. ${item.answer} | incorrect${item.correct_answer ? ` | correct: ${item.correct_answer}` : ''}`;
  }).join('\n');
}

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null || totalSeconds < 0) return 'Ko‘rsatilmagan';
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function breakdownFor(section: string, rows: GatewayAnswer[]): GatewayBreakdown[] {
  const ranges = section === 'listening'
    ? [
        ['Part 1', 1, 10],
        ['Part 2', 11, 20],
        ['Part 3', 21, 30],
        ['Part 4', 31, 40],
      ] as const
    : section === 'reading'
      ? [
          ['Passage 1', 1, 13],
          ['Passage 2', 14, 26],
          ['Passage 3', 27, 40],
        ] as const
      : [];

  return ranges.map(([name, start, end]) => ({
    name,
    start_question: start,
    end_question: end,
    correct: rows.filter((item) => item.question >= start && item.question <= end && item.correct).length,
    total: end - start + 1,
  }));
}

function compactNumber(value: number | null) {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function warningCount(details: Record<string, unknown> | undefined) {
  return Math.max(0, Math.round(numberOrNull(
    details?.warnings ?? details?.warningCount ?? details?.violations ?? details?.violationCount,
  ) || 0));
}

function buildTelegramMessage({
  section,
  studentName,
  rawScore,
  maxScore,
  band,
  durationSeconds,
  warnings,
  breakdown,
}: {
  section: string;
  studentName: string;
  rawScore: number | null;
  maxScore: number | null;
  band: number | null;
  durationSeconds: number | null;
  warnings: number;
  breakdown: GatewayBreakdown[];
}) {
  const skill = section === 'listening' ? 'LISTENING' : section === 'reading' ? 'READING' : section.toUpperCase() || 'TEST';
  const accuracy = rawScore !== null && maxScore !== null && maxScore > 0
    ? Number(((rawScore / maxScore) * 100).toFixed(1))
    : null;
  const durationText = formatDuration(durationSeconds);
  const scoreText = `${compactNumber(rawScore)} / ${compactNumber(maxScore)}`;

  let table = '';
  if (breakdown.length) {
    const rows = breakdown.map((item) => {
      const label = item.name.padEnd(9, ' ');
      const score = `${item.correct} / ${item.total}`.padStart(7, ' ');
      return `│ ${label} │ ${score} │`;
    });
    table = [
      '```',
      '┌───────────┬─────────┐',
      ...rows,
      '├───────────┼─────────┤',
      `│ ${'TOTAL'.padEnd(9, ' ')} │ ${scoreText.padStart(7, ' ')} │`,
      '└───────────┴─────────┘',
      '```',
    ].join('\n');
  }

  return [
    `🏆 **ARK EDUCATION — ${skill} RESULT**`,
    '',
    `👤 **${studentName}**`,
    '',
    table,
    '',
    `🎯 **IELTS Band:** ${compactNumber(band)}`,
    `📊 **Accuracy:** ${accuracy === null ? '—' : `${compactNumber(accuracy)}%`}`,
    `⚠️ **Warnings:** ${warnings}`,
    `⏱ **Time:** ${durationText}`,
    '',
    `✅ **${skill.charAt(0)}${skill.slice(1).toLowerCase()} completed**`,
    '',
    `#${skill}`,
  ].filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== '')).join('\n');
}

function gatewayConfig() {
  const endpoint = process.env.BOT_RESULTS_ENDPOINT?.trim() || '';
  const submitKey = process.env.BOT_RESULTS_SUBMIT_KEY?.trim() || '';

  if (!endpoint || !submitKey) {
    return {
      error: 'BOT_RESULTS_ENDPOINT yoki BOT_RESULTS_SUBMIT_KEY sozlanmagan.',
    } as const;
  }

  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return { error: 'BOT_RESULTS_ENDPOINT xavfsiz HTTPS manzil bo‘lishi kerak.' } as const;
    }
    return { endpoint: url.toString(), submitKey } as const;
  } catch {
    return { error: 'BOT_RESULTS_ENDPOINT noto‘g‘ri URL.' } as const;
  }
}

function responseError(body: GatewayResponse | null) {
  if (!body) return '';
  const status = cleanText(body.status, 30).toLowerCase();
  const failedFlag = (value: unknown) => value === false || value === 0 || cleanText(value, 10).toLowerCase() === 'false';
  const failed = failedFlag(body.ok) || failedFlag(body.success) || ['error', 'failed', 'fail'].includes(status);
  if (!failed) return '';
  return cleanText(body.error || body.message || body.detail, 300) || 'SysDC qabul qiluvchisi natijani rad etdi.';
}

function responseConfirmed(body: GatewayResponse | null) {
  if (!body) return false;
  const truthy = (value: unknown) => value === true || value === 1 || cleanText(value, 10).toLowerCase() === 'true';
  const status = cleanText(body.status, 30).toLowerCase();
  const sentCount = numberOrNull(body.sent_count ?? body.sent ?? body.delivered);
  return truthy(body.ok)
    || truthy(body.success)
    || (sentCount !== null && sentCount > 0)
    || Boolean(cleanText(body.message_id ?? body.telegram_message_id, 120))
    || ['ok', 'success', 'sent', 'delivered'].includes(status);
}

function responseReference(body: GatewayResponse | null, fallback: string) {
  if (!body) return fallback;
  return cleanText(body.reference || body.submission_id || body.submissionId || body.id, 120) || fallback;
}

function submittedAt(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function buildGatewayPayload(result: AdminTestResult, submitKey: string) {
  const firstName = cleanText(result.student.firstName, 80);
  const lastName = cleanText(result.student.lastName, 80);
  const studentName = cleanText(`${firstName} ${lastName}`, 170) || 'Noma’lum o‘quvchi';
  const rows = answerRows(result.details);
  const submissionId = cleanText(result.details?.submissionId, 100)
    || `ark-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const rawScore = numberOrNull(result.rawScore);
  const maxScore = numberOrNull(result.maxScore);
  const durationSeconds = numberOrNull(result.durationSeconds);
  const section = cleanText(result.section, 30).toLowerCase();
  const breakdown = breakdownFor(section, rows);
  const warnings = warningCount(result.details);
  const durationText = formatDuration(durationSeconds);
  const telegramMessage = buildTelegramMessage({
    section,
    studentName,
    rawScore,
    maxScore,
    band: numberOrNull(result.band),
    durationSeconds,
    warnings,
    breakdown,
  });

  return {
    event_type: 'result',
    source: 'ark-platform',
    submit_key: submitKey,
    submission_id: submissionId,
    first_name: firstName,
    last_name: lastName,
    student_name: studentName,
    telegram_id: cleanText(result.student.telegramId, 30),
    test_title: cleanText(result.testTitle, 180),
    test_name: cleanText(result.testTitle, 180),
    track: cleanText(result.track, 30).toLowerCase(),
    section,
    skill: section,
    result_type: `${section || 'test'}_result`,
    raw_score: rawScore,
    score: rawScore,
    max_score: maxScore,
    total: maxScore,
    band: numberOrNull(result.band),
    correct: numberOrNull(result.correct),
    correct_count: numberOrNull(result.correct),
    wrong: numberOrNull(result.wrong),
    wrong_count: numberOrNull(result.wrong),
    unanswered: numberOrNull(result.unanswered),
    unanswered_count: numberOrNull(result.unanswered),
    warnings,
    warning_count: warnings,
    duration_seconds: durationSeconds,
    duration: durationSeconds,
    time_seconds: durationSeconds,
    elapsed_seconds: durationSeconds,
    duration_text: durationText,
    time_text: durationText,
    breakdown,
    parts: breakdown,
    part_scores: Object.fromEntries(breakdown.map((item) => [item.name.toLowerCase().replace(/\s+/g, '_'), {
      correct: item.correct,
      total: item.total,
      start_question: item.start_question,
      end_question: item.end_question,
    }])),
    telegram_message: telegramMessage,
    result_message: telegramMessage,
    message: telegramMessage,
    telegram_parse_mode: 'Markdown',
    submitted_at: submittedAt(result.submittedAt),
    answers: rows,
    answers_by_question: Object.fromEntries(rows.map((item) => [`q${item.question}`, item])),
    answers_text: formatAnswers(rows),
    result: {
      section,
      rawScore,
      maxScore,
      band: numberOrNull(result.band),
      correct: numberOrNull(result.correct),
      wrong: numberOrNull(result.wrong),
      unanswered: numberOrNull(result.unanswered),
      warnings,
      durationSeconds,
      durationText,
      breakdown,
      answers: rows,
      message: telegramMessage,
    },
  };
}

export async function sendAdminTestResult(result: AdminTestResult): Promise<TelegramDelivery> {
  const config = gatewayConfig();
  if ('error' in config) {
    return { configured: false, recipients: 1, sent: 0, failed: 1, error: config.error };
  }

  const payload = buildGatewayPayload(result, config.submitKey);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json; charset=utf-8',
        'x-ark-source': 'ark-platform',
        'x-ark-submit-key': config.submitKey,
        'x-ark-submission-id': payload.submission_id,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });

    const responseText = await response.text();
    let body: GatewayResponse | null = null;
    if (responseText.trim()) {
      try {
        const parsed: unknown = JSON.parse(responseText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed as GatewayResponse;
      } catch {
        body = null;
      }
    }

    const explicitError = responseError(body);
    if (!response.ok || explicitError) {
      const message = explicitError || cleanText(body?.error || body?.message, 300) || `SysDC HTTP ${response.status}`;
      return { configured: true, recipients: 1, sent: 0, failed: 1, status: response.status, error: message };
    }

    if (!responseConfirmed(body)) {
      return {
        configured: true,
        recipients: 1,
        sent: 0,
        failed: 1,
        status: response.status,
        error: 'SysDC Telegram yuborilganini aniq tasdiqlamadi.',
      };
    }

    return {
      configured: true,
      recipients: 1,
      sent: 1,
      failed: 0,
      status: response.status,
      reference: responseReference(body, payload.submission_id),
    };
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'SysDC natija qabul qiluvchisi 12 soniyada javob bermadi.'
      : error instanceof Error ? error.message : 'SysDC natija qabul qiluvchisiga ulanib bo‘lmadi.';
    return { configured: true, recipients: 1, sent: 0, failed: 1, error: message };
  }
}
