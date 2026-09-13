import { telegram } from "../telegram.js";
import { listStudentTargets } from "./assignment-workflow-v2.js";

const TZ = "Asia/Tashkent";
const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-announcement-store";
const GENERIC_TARGET_WORDS = new Set(["test", "quiz", "group", "guruh", "homework", "vazifa"]);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function norm(value = "") {
  return clean(value)
    .toLowerCase()
    .replace(/[ʻ’`]/g, "'")
    .replace(/[^a-z0-9.' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function html(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function botToken() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function enqueueAnnouncement(targetId, messageText, dueAt) {
  const response = await fetch(STORE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-token": botToken()
    },
    body: JSON.stringify({
      action: "enqueue",
      target_id: targetId,
      message_text: messageText,
      due_at: dueAt
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`ARK announcement store failed (${response.status}): ${data.error || "unknown error"}`);
  }
  return data.outbox;
}

function hasToken(haystack, token) {
  return (` ${haystack} `).includes(` ${token} `);
}

async function resolveTarget(text) {
  const targets = await listStudentTargets();
  const value = norm(text);
  const candidates = [];

  for (const target of targets) {
    const title = norm(target.title);
    if (!title) continue;

    let score = 0;
    const words = title.split(" ").filter(Boolean);
    const isNumeric = /^\d+$/.test(title);
    const explicitGroupPhrase = value.includes(`${title} guruh`) || value.includes(`${title} group`) || value.includes(`${title} guruhga`) || value.includes(`${title} guruhiga`);

    if (isNumeric && hasToken(value, title)) score = 120 + title.length;
    else if (words.length >= 2 && value.includes(title)) score = 100 + title.length;
    else if (explicitGroupPhrase) score = 110 + title.length;
    else if (!GENERIC_TARGET_WORDS.has(title) && hasToken(value, title)) score = 40 + title.length;

    if (score > 0) candidates.push({ target, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return { target: null, targets, ambiguous: false };
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return { target: null, targets, ambiguous: true };
  }
  return { target: candidates[0].target, targets, ambiguous: false };
}

function looksLikeAnnouncement(text = "") {
  const value = String(text).toLowerCase().replace(/[ʻ’`]/g, "'");
  const command = /(ogohlantir|xabar\s*ber|xabardor\s*qil|aytib\s*qo'?y|aytinglar|aytib\s*qo'yinglar|eslat|ma'?lum\s*qil)/i.test(value);
  const event = /\b(test|quiz|imtihon|mock|dars)\b.{0,50}\b(bo'?ladi|o'?tkaziladi|boshlanadi|bor)\b/i.test(value)
    || /\b(bo'?ladi|o'?tkaziladi|boshlanadi|bor)\b.{0,50}\b(test|quiz|imtihon|mock|dars)\b/i.test(value);
  return command || event;
}

function timeMentions(text = "") {
  const value = String(text);
  const mentions = [];
  const re = /(?:soat\s*)?(\d{1,2})\s*[:.]\s*(\d{2})/gi;
  for (const match of value.matchAll(re)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;
    const start = match.index || 0;
    const end = start + match[0].length;
    const around = value.slice(Math.max(0, start - 45), Math.min(value.length, end + 55)).toLowerCase().replace(/[ʻ’`]/g, "'");
    const event = /(test|quiz|imtihon|mock|dars).{0,35}(bo'?ladi|o'?tkaziladi|boshlanadi|bor)/i.test(around)
      || /(bo'?ladi|o'?tkaziladi|boshlanadi|bor).{0,35}(test|quiz|imtihon|mock|dars)/i.test(around);
    const command = /(yubor|jo'?nat|xabar\s*ber|ogohlantir|eslat|aytib\s*qo'?y|aytinglar)/i.test(around);
    mentions.push({
      hour,
      minute,
      label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      start,
      around,
      event,
      command
    });
  }
  return mentions;
}

function eventSubject(text = "") {
  const value = String(text).toLowerCase().replace(/[ʻ’`]/g, "'");
  const skill = value.match(/\b(grammar|reading|listening|writing|speaking|vocabulary|vocab)\b/i)?.[1];
  if (/\bimtihon\b/i.test(value)) return "imtihon";
  if (/\bmock\b/i.test(value)) return "mock test";
  if (/\bquiz\b/i.test(value)) return skill ? `${skill} quiz` : "quiz";
  if (/\btest\b/i.test(value)) return skill ? `${skill} test` : "test";
  if (/\bdars\b/i.test(value)) return skill ? `${skill} darsi` : "dars";
  return "tadbir";
}

function dayWord(text = "") {
  const value = String(text).toLowerCase();
  if (/ertaga|tomorrow/.test(value)) return "Ertaga";
  if (/bugun|today/.test(value)) return "Bugun";
  return "Bugun";
}

function announcementText(text, eventTime = null) {
  if (eventTime) {
    const subject = eventSubject(text);
    return `${dayWord(text)} soat ${eventTime.label} da ${subject} bo'ladi.\n\nIltimos, vaqtida tayyor bo'ling.`;
  }

  let body = String(text || "").trim();
  body = body
    .replace(/\b\d+\s*(?:guruh(?:ga|iga)?|group(?:ga|iga)?)\b/ig, "")
    .replace(/\b(?:ogohlantir(?:ib)?(?:\s*qo['‘]?y(?:inglar)?)?|xabar\s*ber(?:inglar)?|xabardor\s*qil(?:inglar)?|aytib\s*qo['‘]?y(?:inglar)?|aytinglar|eslat(?:ib\s*qo['‘]?y(?:inglar)?)?|ma['‘]?lum\s*qil(?:inglar)?)\b/ig, "")
    .replace(/^\s*(?:ki|deb)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return body || "Muhim e'lon bor. Iltimos, guruhdagi xabarni ko'rib chiqing.";
}

function localDueIso(hour, minute, text = "") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const base = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+05:00`);
  if (/ertaga|tomorrow/i.test(String(text))) base.setUTCDate(base.getUTCDate() + 1);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`).toISOString();
}

export async function tryHandleStaffAnnouncement(incoming) {
  const raw = incoming?.message?.text || incoming?.message?.caption || "";
  if (!raw || !looksLikeAnnouncement(raw)) return false;
  if (!/(guruh|group|909|ielts|cefr|404)/i.test(raw)) return false;

  // Explicit quiz-creation commands remain quiz commands, not announcements.
  const creation = /(quiz|test|mcq).{0,25}(tuz|yarat|tayyorla|qilib\s*ber|tashla)|(?:tuz|yarat|tayyorla).{0,25}(quiz|test|mcq)|\b\d{1,2}\s*ta\s*(?:quiz|test|savol)/i.test(raw);
  const warning = /(ogohlantir|xabar\s*ber|aytib\s*qo['‘]?y|aytinglar|eslat|ma['‘]?lum\s*qil|xabardor\s*qil)/i.test(raw);
  if (creation && !warning) return false;

  const matched = await resolveTarget(raw);
  if (!matched.target) {
    const names = matched.targets.slice(0, 10).map(item => `• ${item.title}`).join("\n");
    await telegram("sendMessage", {
      chat_id: Number(incoming.chatId),
      text: `🧸 <b>Qaysi guruhga aytay?</b>${matched.ambiguous ? "\nBir nechta mos guruh topildi." : ""}\n${html(names)}`,
      parse_mode: "HTML"
    });
    return true;
  }

  const times = timeMentions(raw);
  const eventTime = times.find(item => item.event) || null;
  const sendTime = times.find(item => !item.event && item.command) || null;
  const message = announcementText(raw, eventTime);
  const target = matched.target;

  if (sendTime) {
    const dueAt = localDueIso(sendTime.hour, sendTime.minute, raw);
    if (new Date(dueAt).getTime() > Date.now() + 20_000) {
      await enqueueAnnouncement(target.id, `📢 Eslatma\n\n${message}`, dueAt);
      await telegram("sendMessage", {
        chat_id: Number(incoming.chatId),
        text: `🧸 <b>${html(target.title)}</b> guruhiga e'lonni <b>${sendTime.label}</b> ga rejaladim.${eventTime ? `\n<i>${html(eventTime.label)} — ${html(eventSubject(raw))} vaqti.</i>` : ""}`,
        parse_mode: "HTML"
      });
      return true;
    }
  }

  await telegram("sendMessage", {
    chat_id: Number(target.chat_id),
    text: `📢 <b>Eslatma</b>\n\n${html(message).replace(/\n/g, "\n")} `,
    parse_mode: "HTML"
  });
  await telegram("sendMessage", {
    chat_id: Number(incoming.chatId),
    text: `🧸 <b>${html(target.title)}</b> guruhini ogohlantirdim.${eventTime ? `\n<i>${html(eventTime.label)} dagi ${html(eventSubject(raw))} haqida xabar berdim.</i>` : ""}`,
    parse_mode: "HTML"
  });
  return true;
}
