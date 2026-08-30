const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-bot-store";

function botToken() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function store(action, payload = {}) {
  const response = await fetch(STORE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-token": botToken()
    },
    body: JSON.stringify({ action, ...payload })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`ARK bot store ${action} failed (${response.status}): ${data.error || "unknown error"}`);
  }
  return data;
}

export async function getPersistentHistory(businessConnectionId, chatId) {
  const data = await store("get_history", {
    business_connection_id: businessConnectionId || "",
    chat_id: chatId
  });
  return Array.isArray(data.history) ? data.history.slice(-16) : [];
}

export async function savePersistentHistory(businessConnectionId, chatId, history) {
  await store("save_history", {
    business_connection_id: businessConnectionId || "",
    chat_id: chatId,
    history: Array.isArray(history) ? history.slice(-16) : []
  });
}

export async function saveTeacherIdentity(telegramUserId, businessConnectionId) {
  if (!telegramUserId) return;
  await store("save_teacher", {
    telegram_user_id: telegramUserId,
    business_connection_id: businessConnectionId || ""
  });
}

export async function logIncomingMessage(incoming, contentType, textPreview = "") {
  const { message, chatId, businessConnectionId, studentName } = incoming;
  await store("log_message", {
    business_connection_id: businessConnectionId || "",
    chat_id: chatId,
    student_user_id: message?.from?.id || null,
    student_name: studentName,
    content_type: contentType,
    text_preview: String(textPreview || "").slice(0, 600),
    telegram_message_id: message?.message_id || null
  });
}

export async function createPendingHomework(incoming, {
  submissionKind = "photo",
  description = "",
  fileId = null,
  caption = ""
} = {}) {
  const { message, chatId, businessConnectionId, studentName } = incoming;
  return store("create_pending_homework", {
    business_connection_id: businessConnectionId || "",
    chat_id: chatId,
    student_user_id: message?.from?.id || null,
    student_name: studentName,
    submission_kind: submissionKind,
    description,
    telegram_message_id: message?.message_id || null,
    telegram_file_id: fileId,
    caption
  });
}

export async function getPendingHomework(incoming) {
  const data = await store("get_pending_homework", {
    business_connection_id: incoming.businessConnectionId || "",
    chat_id: incoming.chatId
  });
  return data.pending || null;
}

export async function resolvePendingHomework(id, assignmentType, status = "received", description = "") {
  await store("resolve_pending_homework", {
    id,
    assignment_type: assignmentType,
    status,
    description
  });
}

export async function logHomework(incoming, {
  assignmentType = "Homework",
  submissionKind = "message",
  description = "",
  status = "received",
  fileId = null,
  caption = ""
} = {}) {
  const { message, chatId, businessConnectionId, studentName } = incoming;
  return store("log_homework", {
    business_connection_id: businessConnectionId || "",
    chat_id: chatId,
    student_user_id: message?.from?.id || null,
    student_name: studentName,
    assignment_type: assignmentType,
    submission_kind: submissionKind,
    description,
    status,
    telegram_message_id: message?.message_id || null,
    telegram_file_id: fileId,
    caption
  });
}

export async function prepareDailyReport() {
  return store("prepare_daily_report");
}

export async function markDailyReportSent(reportDate, telegramUserId) {
  return store("mark_daily_report_sent", {
    report_date: reportDate,
    telegram_user_id: telegramUserId
  });
}
