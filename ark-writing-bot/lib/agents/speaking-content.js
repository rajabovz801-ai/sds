import { telegram } from "../telegram.js";
import { matchTarget } from "./assignment-workflow-v2.js";
import { runAgent } from "./openai.js";

const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-agent-store";
const TZ = "Asia/Tashkent";

function botToken() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function store(action, payload = {}) {
  const response = await fetch(STORE_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-token": botToken() },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`ARK agent store ${action} failed (${response.status}): ${data.error || "unknown error"}`);
  return data;
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function html(value = "") {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isSpeakingContentRequest(text = "") {
  const value = String(text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  const speaking = /\bspeaking\b/.test(value);
  const content = /(part\s*1|sample\s*answer|band\s*[4-9]|savol|question)/.test(value);
  const create = /(tayyorla|tuz|yarat|ber|yoz)/.test(value);
  const deliver = /(guruh|group|yubor|jo'nat|send)/.test(value);
  return speaking && content && create && deliver;
}

function parseCount(text = "") {
  const match = String(text).match(/\b(\d{1,2})\s*ta\s*(?:savol|question)/i);
  return Math.max(1, Math.min(10, Number(match?.[1] || 4)));
}

function parseBand(text = "") {
  const match = String(text).match(/\bband\s*([4-9](?:\.5)?)\b/i);
  return match ? match[1] : "6";
}

function parseSentenceCount(text = "") {
  const value = String(text);
  const patterns = [
    /har\s+bir(?:\s+javob|ida)?[^\d]{0,30}(\d{1,2})\s*ta\s*gap/i,
    /(\d{1,2})\s*ta\s*gap[^.]{0,25}har\s+bir/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return Math.max(2, Math.min(8, Number(match[1])));
  }
  return 4;
}

function parseTopic(text = "") {
  const quoted = String(text).match(/["“”']([^"“”']{2,80})["“”']/);
  if (quoted?.[1]) return clean(quoted[1]);
  const mavzu = String(text).match(/(?:mavzusida|topic\s*[:\-]?)[\s]*([A-Za-z][A-Za-z\s-]{1,60}?)(?=\s+(?:IELTS|Speaking|Part|uchun|bo['‘]?yicha)|[,.]|$)/i);
  if (mavzu?.[1]) return clean(mavzu[1]);
  const about = String(text).match(/\b(?:haqida|about)\s+([A-Za-z][A-Za-z\s-]{1,50})/i);
  if (about?.[1]) return clean(about[1]);
  return "Teacher";
}

function tashkentDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function localIsoAt(hour, minute, dayOffset = 0) {
  const p = tashkentDateParts();
  const base = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + dayOffset, 12, 0, 0));
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`).toISOString();
}

function parseSendAt(text = "") {
  const value = String(text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  const match = value.match(/(?:soat\s*)?(\d{1,2})\s*[:.]\s*(\d{2})/);
  if (!match || !/(yubor|jo'nat|send)/.test(value)) return new Date().toISOString();
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return new Date().toISOString();
  return localIsoAt(hour, minute, /ertaga|tomorrow/.test(value) ? 1 : 0);
}

function formatSendTime(iso) {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(iso));
}

export async function tryHandleSpeakingContentRequest(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!isSpeakingContentRequest(text)) return false;

  const matched = await matchTarget(text);
  if (!matched.target) {
    const names = matched.targets.slice(0, 8).map(item => `• ${item.title}`).join("\n");
    await telegram("sendMessage", {
      chat_id: Number(incoming.chatId),
      text: `🧸 <b>Qaysi guruhga yuboray?</b>\n${html(names)}`,
      parse_mode: "HTML"
    });
    return true;
  }

  const count = parseCount(text);
  const band = parseBand(text);
  const sentenceCount = parseSentenceCount(text);
  const topic = parseTopic(text);
  const sendAt = parseSendAt(text);

  const generationInstruction = [
    `Create student-facing IELTS Speaking Part 1 practice on the topic "${topic}".`,
    `Give exactly ${count} Part 1 questions.`,
    `For each question, write one Band ${band} sample answer with exactly ${sentenceCount} complete sentences.`,
    "Use natural English suitable for that band. Keep answers realistic and easy for students to learn from.",
    "Output ONLY the finished student material. Do not mention the staff instruction, target group, scheduling, homework workflow, files, replies, or administration.",
    `Use this plain-text format:\n🎤 IELTS Speaking Part 1 — ${topic}\n\n1. Question\nSample answer: ...\n\n2. Question\nSample answer: ...`
  ].join("\n");

  const material = clean(await runAgent("teacher", generationInstruction, "This text will be sent directly to students, so it must be polished and student-facing only.")).replace(/\s*\n\s*/g, "\n");
  const future = new Date(sendAt).getTime() > Date.now() + 30_000;

  if (future) {
    await store("insert_assignment", {
      assignment: {
        staff_chat_id: Number(incoming.chatId),
        target_id: matched.target.id,
        target_chat_id: Number(matched.target.chat_id),
        target_title: matched.target.title,
        created_by: Number(incoming.message?.from?.id || 0) || null,
        title: `Speaking Part 1 — ${topic}`,
        body: material,
        assignment_type: "content",
        status: "scheduled",
        send_at: sendAt,
        deadline_at: null,
        remind_at: null,
        source_chat_id: null,
        source_message_id: null,
        requires_submission: false,
        payload: { generated_by: "teacher", content_kind: "speaking_part_1", topic, band, question_count: count, sentence_count: sentenceCount }
      }
    });
    await telegram("sendMessage", {
      chat_id: Number(incoming.chatId),
      text: `🧸 <b>Speaking materiali tayyor.</b>\n${html(matched.target.title)} guruhiga <b>${html(formatSendTime(sendAt))}</b> da yuboraman.\n<i>${count} ta Part 1 savol • Band ${html(band)} • har javob ${sentenceCount} ta gap.</i>`,
      parse_mode: "HTML"
    });
    return true;
  }

  await telegram("sendMessage", {
    chat_id: Number(matched.target.chat_id),
    text: material,
    disable_web_page_preview: true
  });
  await telegram("sendMessage", {
    chat_id: Number(incoming.chatId),
    text: `🧸 <b>Tayyor materialni ${html(matched.target.title)} guruhiga yubordim.</b>\n<i>${count} ta Part 1 savol • Band ${html(band)} • har javob ${sentenceCount} ta gap.</i>`,
    parse_mode: "HTML"
  });
  return true;
}
