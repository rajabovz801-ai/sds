import { sendDocument, sendMessage, telegram } from "../telegram.js";
import { generateQuiz, reviewQuizContent } from "./openai.js";
import { formatSpoilerAnswerKey, parseRequestedQuestionCount, requestsExternalGroup } from "./material-standards.mjs";
import { renderQuizPdf } from "./quiz-pdf.mjs";

const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-agent-store";
const STAFF_TITLE = "ARK AI STAFF";
const GENERIC_TARGET_TITLES = new Set(["test", "quiz", "group", "guruh", "homework", "vazifa"]);
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

function clean(value = "") { return String(value || "").replace(/\s+/g, " ").trim(); }
function norm(value = "") { return clean(value).toLowerCase().replace(/[ʻ’`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim(); }
function html(value = "") { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function fileFromMessage(message = {}) {
  if (message.photo?.length) return { kind: "photo", fileId: message.photo[message.photo.length - 1]?.file_id || null };
  if (message.document) return { kind: "document", fileId: message.document.file_id || null };
  if (message.video) return { kind: "video", fileId: message.video.file_id || null };
  if (message.audio) return { kind: "audio", fileId: message.audio.file_id || null };
  if (message.voice) return { kind: "voice", fileId: message.voice.file_id || null };
  return null;
}

function tashkentParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function localIsoAt(hour, minute, dayOffset = 0) {
  const p = tashkentParts();
  const anchor = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + dayOffset));
  const y = anchor.getUTCFullYear();
  const m = String(anchor.getUTCMonth() + 1).padStart(2, "0");
  const d = String(anchor.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`).toISOString();
}

function timePlan(text = "") {
  const value = String(text).toLowerCase().replace(/[ʻ’`]/g, "'");
  const tomorrow = /ertaga|tomorrow/.test(value) ? 1 : 0;
  const matches = [...value.matchAll(/(?:soat\s*)?(\d{1,2})(?::|\.)(\d{2})/g)].map(m => ({ hour: Number(m[1]), minute: Number(m[2]), index: m.index || 0, raw: m[0] })).filter(x => x.hour >= 0 && x.hour <= 23 && x.minute >= 0 && x.minute <= 59);
  let sendAt = new Date().toISOString();
  let deadlineAt = null;
  for (const item of matches) {
    const around = value.slice(Math.max(0, item.index - 60), item.index + item.raw.length + 70);
    const iso = localIsoAt(item.hour, item.minute, tomorrow);
    if (/gacha|deadline|topshir|yakun|oxirgi/.test(around)) deadlineAt = iso;
    else if (/yubor|jo'nat|send|chiqar|tashla/.test(around) && !/gacha/.test(around)) sendAt = iso;
  }
  if (matches.length === 1 && sendAt === null) sendAt = localIsoAt(matches[0].hour, matches[0].minute, tomorrow);
  if (matches.length === 1 && !deadlineAt && /gacha|deadline|topshir/.test(value)) deadlineAt = localIsoAt(matches[0].hour, matches[0].minute, tomorrow);
  if (matches.length >= 2 && !deadlineAt) deadlineAt = localIsoAt(matches[matches.length - 1].hour, matches[matches.length - 1].minute, tomorrow);
  const reminderAt = deadlineAt ? new Date(Math.max(Date.now(), new Date(deadlineAt).getTime() - 30 * 60 * 1000)).toISOString() : null;
  return { sendAt, deadlineAt, reminderAt };
}

function requestedLevel(text = "") { const m = String(text).match(/\b(A1|A2|B1|B2|C1|C2)\b/i); return m ? m[1].toUpperCase() : "B1"; }
function taskTitle(text = "", fallback = "Uyga vazifa") { return (String(text || "").split(/\n/).map(clean).find(Boolean) || fallback).replace(/(?:ielts|cefr|909|group|guruh)[^,.;]{0,20}(?:yubor|jo'nat|send).*/i, "").replace(/(?:deadline|gacha)\s*[:\-]?\s*\d{1,2}[:.]\d{2}.*/i, "").trim().slice(0, 120) || fallback; }
function taskBody(text = "", targetTitle = "") { let value = String(text || "").trim(); if (targetTitle) value = value.replace(new RegExp(targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), ""); return value.replace(/\b(?:guruhga|groupga|guruhiga|groupiga)\s*(?:yubor|jo['‘]?nat|send)?\b/ig, "").replace(/\b(?:yubor|jo['‘]?nat|send)\b\s*(?:qil|ber)?/ig, "").replace(/\b(?:deadline|gacha)\b\s*[:\-]?\s*\d{1,2}[:.]\d{2}/ig, "").replace(/\b(?:ertaga|bugun)\s+soat\s+\d{1,2}[:.]\d{2}\s*(?:da)?/ig, "").replace(/\n{3,}/g, "\n\n").trim() || "Uyga vazifani bajaring va rasm yoki fayl ko'rinishida yuboring."; }

export async function listStudentTargets() {
  const data = await store("list_targets");
  return (data.targets || []).filter(item => norm(item.title) !== norm(STAFF_TITLE));
}

export async function matchTarget(text = "") {
  const targets = await listStudentTargets();
  const haystack = ` ${norm(text)} `;
  const exact = targets.filter(target => {
    const title = norm(target.title);
    if (!title) return false;
    if (GENERIC_TARGET_TITLES.has(title)) {
      return haystack.includes(` ${title} guruh `) || haystack.includes(` ${title} group `) || haystack.includes(` ${title} guruhga `) || haystack.includes(` ${title} groupga `);
    }
    return haystack.includes(` ${title} `);
  }).sort((a, b) => norm(b.title).length - norm(a.title).length);
  if (exact.length) return { target: exact[0], targets, ambiguous: false };
  const scored = targets.map(target => {
    const title = norm(target.title);
    if (GENERIC_TARGET_TITLES.has(title)) return { target, score: 0 };
    const words = title.split(" ").filter(word => word.length >= 2);
    return { target, score: words.reduce((sum, word) => sum + (haystack.includes(` ${word} `) ? 1 : 0), 0) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return { target: null, targets, ambiguous: false };
  if (scored.length > 1 && scored[0].score === scored[1].score) return { target: null, targets, ambiguous: true };
  return { target: scored[0].target, targets, ambiguous: false };
}

async function sendAssignmentNow(assignment) {
  let sent;
  if (assignment.source_chat_id && assignment.source_message_id) {
    sent = await telegram("copyMessage", { chat_id: Number(assignment.target_chat_id), from_chat_id: Number(assignment.source_chat_id), message_id: Number(assignment.source_message_id) });
  } else {
    const lines = [`📚 <b>${html(assignment.title)}</b>`, assignment.body ? `\n${html(assignment.body)}` : "", assignment.deadline_at ? `\n⏰ <b>Deadline:</b> ${new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(assignment.deadline_at))}` : "", assignment.requires_submission ? "\n<i>Bajargach rasm yoki faylni shu guruhga yuboring. Reply qilish shart emas.</i>" : ""].filter(Boolean).join("\n");
    sent = await telegram("sendMessage", { chat_id: Number(assignment.target_chat_id), text: lines, parse_mode: "HTML", disable_web_page_preview: true });
  }
  const updated = (await store("update_assignment", { id: assignment.id, patch: { status: "active", target_message_id: sent?.message_id || null, updated_at: new Date().toISOString() } })).assignment;
  await store("snapshot_members", { assignment: updated });
  return updated;
}

function assignmentWording(text = "") { return /(uyga\s*vazifa|homework|vazifa|topshiriq|guruhga|groupga|guruhiga|groupiga|deadline|topshir)/i.test(text); }

export async function tryHandleStaffAssignment(incoming) {
  const message = incoming?.message;
  const raw = message?.text || message?.caption || "";
  if (!raw || !assignmentWording(raw)) return false;
  const { target, targets, ambiguous } = await matchTarget(raw);
  if (!target) {
    if (!/(guruh|group|yubor|jo['‘]?nat|send)/i.test(raw)) return false;
    const names = targets.slice(0, 8).map(item => `• ${item.title}`).join("\n");
    await telegram("sendMessage", { chat_id: Number(incoming.chatId), text: `🧸 <b>Qaysi guruhga yuboray?</b>\n${ambiguous ? "Bir nechta mos guruh bor.\n" : ""}${html(names)}`, parse_mode: "HTML" });
    return true;
  }
  const plan = timePlan(raw);
  const source = message.reply_to_message || (fileFromMessage(message) ? message : null);
  const body = source && source !== message && (source.text || source.caption) ? clean(source.text || source.caption) : taskBody(raw, target.title);
  const assignment = (await store("insert_assignment", { assignment: { staff_chat_id: Number(incoming.chatId), target_id: target.id, target_chat_id: Number(target.chat_id), target_title: target.title, created_by: Number(message.from?.id || 0) || null, title: taskTitle(body, "Uyga vazifa"), body, assignment_type: /quiz|test|mcq/i.test(raw) ? "quiz" : "homework", status: "scheduled", send_at: plan.sendAt, deadline_at: plan.deadlineAt, remind_at: plan.reminderAt, source_chat_id: source ? Number(source.chat?.id || incoming.chatId) : null, source_message_id: source ? Number(source.message_id) : null, requires_submission: true, payload: { source_kind: fileFromMessage(source || {})?.kind || "text" } } })).assignment;
  const sendNow = new Date(plan.sendAt).getTime() <= Date.now() + 30_000;
  if (sendNow) await sendAssignmentNow(assignment);
  const sendText = sendNow ? "yubordim" : `${new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(plan.sendAt))} ga rejaladim`;
  const deadlineText = plan.deadlineAt ? ` Deadline ${new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(plan.deadlineAt))}.` : "";
  await telegram("sendMessage", { chat_id: Number(incoming.chatId), text: `🧸 <b>${html(target.title)}</b> guruhiga ${sendText}.${deadlineText}\n<i>Topshiriqlarni o'zim kuzataman, ortiqcha guruh chatiga aralashmayman.</i>`, parse_mode: "HTML" });
  return true;
}

function quizTopic(text = "") {
  return clean(String(text)
    .replace(/\b\d+\s*(?:guruh|group)(?:ga|iga)?\s*(?:uchun)?\b/ig, "")
    .replace(/\b\d+\s*ta\b/ig, "")
    .replace(/\b(?:quiz|test|mcq|savol|pdf|a4)\b/ig, "")
    .replace(/\b(?:yaratib|yarat|tuz|tuzib|qil|tayyorla|ber|yubor|jo['‘]?nat)\w*\b/ig, "")
    .replace(/\b(?:A1|A2|B1|B2|C1|C2)\b/ig, "")
    .replace(/\b(?:guruhga|groupga|guruhiga|groupiga|guruh|group|uchun)\b/ig, "")
    .replace(/\b(?:bugun|ertaga|today|tomorrow)\b/ig, "")
    .replace(/\b(?:soat\s*)?\d{1,2}[:.]\d{2}\s*(?:da|ga)?\b/ig, "")
    .replace(/\bpass\s*\d{1,2}\s*\/\s*\d{1,2}\b/ig, "")) || "English grammar";
}

export async function tryHandleQuizRequest(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!/\b(quiz|mcq|test)\b/i.test(text)) return false;
  if (/writing|essay|mock test|full mock/i.test(text) && !/grammar|vocab|present|past|future|article|preposition|pronoun|to be/i.test(text)) return false;
  const count = parseRequestedQuestionCount(text, 10);
  const level = requestedLevel(text);
  const draft = await generateQuiz({ topic: quizTopic(text), level, count, language: "English", instruction: text });
  const quiz = await reviewQuizContent(draft, text);
  const total = quiz.questions.length;
  const wantsGroup = requestsExternalGroup(text);
  const matched = wantsGroup ? await matchTarget(text) : { target: null, targets: [], ambiguous: false };
  if (wantsGroup && !matched.target) {
    const names = matched.targets.slice(0, 8).map(item => `• ${item.title}`).join("\n");
    await sendMessage(incoming.chatId, `🧸 Qaysi guruhga yuboray?\n${names}`, incoming.businessConnectionId);
    return true;
  }
  const pdf = await renderQuizPdf(quiz);
  const destination = matched.target ? Number(matched.target.chat_id) : Number(incoming.chatId);
  const filename = `${clean(quiz.title).replace(/[^a-z0-9]+/gi, "_").slice(0, 50) || "ARK_Quiz"}.pdf`;
  await sendDocument(destination, pdf, filename, `ARK Education • ${total} ta savol • A4`);
  await telegram("sendMessage", {
    chat_id: Number(incoming.chatId),
    text: formatSpoilerAnswerKey(quiz),
    parse_mode: "HTML",
    disable_web_page_preview: true
  });
  await telegram("sendMessage", {
    chat_id: Number(incoming.chatId),
    text: matched.target
      ? `🧸 ${quiz.title} PDFini ${matched.target.title} guruhiga yubordim.`
      : `🧸 ${quiz.title} uchun A4 PDF tayyor. Javob kaliti yopiq spoilerda.`,
  });
  return true;
}
