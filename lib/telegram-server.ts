import 'server-only';

type AnswerDetail = {
  answer?: unknown;
  correctAnswer?: unknown;
  status?: unknown;
  correct?: unknown;
};

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
  error?: string;
};

const MAX_TELEGRAM_TEXT = 3900;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanInline(value: unknown, max = 90) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  return escapeHtml(text.length > max ? `${text.slice(0, max - 1)}…` : text);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function durationLabel(value: unknown) {
  const total = numberOrNull(value);
  if (total === null || total < 0) return '—';
  const seconds = Math.round(total);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function answerRows(details: Record<string, unknown> | undefined) {
  const raw = details?.answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  return Object.entries(raw as Record<string, AnswerDetail>)
    .map(([key, item]) => {
      const question = Number(String(key).replace(/\D/g, ''));
      const detail = item && typeof item === 'object' ? item : {};
      const answer = String(detail.answer ?? '').trim();
      const expected = String(detail.correctAnswer ?? '').trim();
      const status = String(detail.status ?? '').toLowerCase();
      const isCorrect = detail.correct === true || status === 'correct';
      const isEmpty = !answer || status === 'unanswered';
      return { question, answer, expected, isCorrect, isEmpty };
    })
    .filter((item) => Number.isInteger(item.question) && item.question > 0)
    .sort((a, b) => a.question - b.question)
    .map((item) => {
      if (item.isEmpty) return `${item.question}. —  ⬜`;
      if (item.isCorrect) return `${item.question}. ${cleanInline(item.answer)}  ✅`;
      return `${item.question}. ${cleanInline(item.answer)}  ❌${item.expected ? `  →  ${cleanInline(item.expected)}` : ''}`;
    });
}

function splitMessage(lines: string[]) {
  const chunks: string[] = [];
  let current = '';

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= MAX_TELEGRAM_TEXT) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    current = line.slice(0, MAX_TELEGRAM_TEXT);
  }
  if (current) chunks.push(current);
  return chunks;
}

function buildMessages(result: AdminTestResult) {
  const fullName = `${result.student.firstName || ''} ${result.student.lastName || ''}`.trim() || 'Noma’lum o‘quvchi';
  const score = result.rawScore != null && result.maxScore != null
    ? `${result.rawScore}/${result.maxScore}`
    : result.rawScore != null ? String(result.rawScore) : '—';
  const band = result.band != null ? ` · Band ${result.band}` : '';
  const submittedAt = result.submittedAt && !Number.isNaN(Date.parse(result.submittedAt))
    ? new Intl.DateTimeFormat('uz-UZ', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Tashkent',
      }).format(new Date(result.submittedAt))
    : new Intl.DateTimeFormat('uz-UZ', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Tashkent',
      }).format(new Date());

  const lines = [
    '<b>ARK EDUCATION · TEST NATIJASI</b>',
    '',
    `👤 <b>O‘quvchi:</b> ${cleanInline(fullName, 150)}`,
    `🆔 <b>Telegram ID:</b> ${cleanInline(result.student.telegramId)}`,
    `📘 <b>Test:</b> ${cleanInline(result.testTitle, 180)}`,
    `🧩 <b>Bo‘lim:</b> ${cleanInline(`${result.track || ''} ${result.section || ''}`.trim().toUpperCase())}`,
    `🎯 <b>Natija:</b> ${cleanInline(score)}${band}`,
    `✅ ${result.correct ?? '—'}   ❌ ${result.wrong ?? '—'}   ⬜ ${result.unanswered ?? '—'}`,
    `⏱ <b>Sarflangan vaqt:</b> ${durationLabel(result.durationSeconds)}`,
    `🗓 <b>Yuborildi:</b> ${cleanInline(submittedAt, 120)}`,
  ];

  const rows = answerRows(result.details);
  if (rows.length) lines.push('', '<b>O‘QUVCHI JAVOBLARI</b>', ...rows);
  return splitMessage(lines);
}

function configuredChatIds(explicit: Array<string | number>) {
  const fromEnv = `${process.env.TELEGRAM_ADMIN_CHAT_IDS || ''},${process.env.TELEGRAM_ADMIN_CHAT_ID || ''}`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...explicit.map(String), ...fromEnv].map((item) => item.trim()).filter(Boolean))];
}

export async function sendAdminTestResult(result: AdminTestResult, explicitChatIds: Array<string | number> = []): Promise<TelegramDelivery> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIds = configuredChatIds(explicitChatIds);

  if (!token) {
    return { configured: false, recipients: chatIds.length, sent: 0, failed: chatIds.length, error: 'TELEGRAM_BOT_TOKEN sozlanmagan.' };
  }
  if (!chatIds.length) {
    return { configured: true, recipients: 0, sent: 0, failed: 0, error: 'Faol admin Telegram ID topilmadi.' };
  }

  const messages = buildMessages(result);
  let sent = 0;
  let failed = 0;
  let lastError = '';

  for (const chatId of chatIds) {
    let recipientOk = true;
    for (const text of messages) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        const body = await response.json().catch(() => null) as { ok?: boolean; description?: string } | null;
        if (!response.ok || !body?.ok) throw new Error(body?.description || `Telegram HTTP ${response.status}`);
      } catch (error) {
        recipientOk = false;
        lastError = error instanceof Error ? error.message : 'Telegramga yuborilmadi.';
        break;
      }
    }
    if (recipientOk) sent += 1;
    else failed += 1;
  }

  return {
    configured: true,
    recipients: chatIds.length,
    sent,
    failed,
    ...(lastError ? { error: lastError } : {}),
  };
}
