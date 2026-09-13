import PDFDocument from "pdfkit";
import { sendDocument, sendMessage, telegram } from "../telegram.js";
import { generateQuiz } from "./openai.js";
import { sendAgentMessage, sendAgentQuizPoll } from "./telegram.js";

const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-agent-store";
const STAFF_TITLE = "ARK AI STAFF";
const GROUP_TYPES = new Set(["group", "supergroup"]);
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
function groupMessage(message) { return Boolean(message?.chat?.id && GROUP_TYPES.has(message.chat?.type)); }
function displayName(user = {}) { return clean([user.first_name, user.last_name].filter(Boolean).join(" ")) || clean(user.username) || `Student ${user.id || ""}`.trim(); }

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
  const base = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+05:00`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`).toISOString();
}

function timePlan(text = "") {
  const value = String(text).toLowerCase().replace(/[ʻ’`]/g, "'");
  const tomorrow = /ertaga|tomorrow/.test(value) ? 1 : 0;
  const matches = [...value.matchAll(/(?:soat\s*)?(\d{1,2})(?::|\.)(\d{2})/g)].map(m => ({ hour: Number(m[1]), minute: Number(m[2]), index: m.index || 0, raw: m[0] })).filter(x => x.hour >= 0 && x.hour <= 23 && x.minute >= 0 && x.minute <= 59);
  let sendAt = new Date().toISOString();
  let deadlineAt = null;
  for (const item of matches) {
    const around = value.slice(Math.max(0, item.index - 35), item.index + item.raw.length + 35);
    const iso = localIsoAt(item.hour, item.minute, tomorrow);
    if (/gacha|deadline|topshir|yakun|oxirgi/.test(around)) deadlineAt = iso;
    else if (/yubor|jo'nat|send|chiqar|tashla/.test(around) && !/gacha/.test(around)) sendAt = iso;
  }
  if (matches.length === 1 && !deadlineAt && /gacha|deadline|topshir/.test(value)) deadlineAt = localIsoAt(matches[0].hour, matches[0].minute, tomorrow);
  if (matches.length >= 2 && !deadlineAt) deadlineAt = localIsoAt(matches[matches.length - 1].hour, matches[matches.length - 1].minute, tomorrow);
  const reminderAt = deadlineAt ? new Date(Math.max(Date.now(), new Date(deadlineAt).getTime() - 30 * 60 * 1000)).toISOString() : null;
  return { sendAt, deadlineAt, reminderAt };
}

function requestedPass(text = "", total = 10) {
  const ratio = String(text).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  if (ratio && Number(ratio[2]) === total) return Math.min(total, Math.max(1, Number(ratio[1])));
  const explicit = String(text).match(/(?:pass|o['‘]?tish|chegara)[^\d]{0,12}(\d{1,2})/i);
  if (explicit) return Math.min(total, Math.max(1, Number(explicit[1])));
  return Math.max(1, Math.ceil(total * 0.8));
}

function requestedCount(text = "", fallback = 10) {
  for (const pattern of [/\b(\d{1,2})\s*ta\s*(?:quiz|test|savol)/i, /(?:quiz|test|savol)[^\d]{0,12}(\d{1,2})\s*ta/i, /\b(\d{1,2})\s*(?:questions?|savol)/i]) {
    const m = String(text).match(pattern);
    if (m) return Math.max(1, Math.min(20, Number(m[1])));
  }
  return fallback;
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
  const exact = targets.filter(target => haystack.includes(` ${norm(target.title)} `)).sort((a, b) => norm(b.title).length - norm(a.title).length);
  if (exact.length) return { target: exact[0], targets, ambiguous: false };
  const scored = targets.map(target => { const words = norm(target.title).split(" ").filter(word => word.length >= 2); return { target, score: words.reduce((sum, word) => sum + (haystack.includes(` ${word} `) ? 1 : 0), 0) }; }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return { target: null, targets, ambiguous: false };
  if (scored.length > 1 && scored[0].score === scored[1].score) return { target: null, targets, ambiguous: true };
  return { target: scored[0].target, targets, ambiguous: false };
}

export async function recordGroupMember(message) {
  if (!groupMessage(message) || !message?.from?.id || message.from.is_bot) return false;
  await store("upsert_group_member", { chat_id: Number(message.chat.id), user: message.from });
  return true;
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

function quizTopic(text = "") { return clean(String(text).replace(/\b\d+\s*ta\b/ig, "").replace(/\b(?:quiz|test|mcq|savol)\b/ig, "").replace(/\b(?:yaratib|yarat|tuz|tuzib|qil|tayyorla|ber|yubor|jo['‘]?nat)\w*\b/ig, "").replace(/\b(?:A1|A2|B1|B2|C1|C2)\b/ig, "").replace(/\b(?:guruhga|groupga|guruhiga|groupiga)\b/ig, "")) || "English grammar"; }

async function quizPdf(quiz, passScore) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true, info: { Title: `${quiz.title} - ARK Education` } });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Helvetica-Bold").fontSize(17).text("ARK EDUCATION CENTRE", { align: "center" });
    doc.moveDown(0.3).fontSize(15).text(clean(quiz.title), { align: "center" });
    doc.moveDown(0.4).font("Helvetica").fontSize(10).text(`Questions: ${quiz.questions.length}   Pass: ${passScore}/${quiz.questions.length}`, { align: "center" });
    doc.moveDown(1);
    quiz.questions.forEach((q, index) => { if (doc.y > 700) doc.addPage(); doc.font("Helvetica-Bold").fontSize(11).text(`${index + 1}. ${clean(q.question)}`); doc.font("Helvetica").fontSize(10); q.options.forEach((option, optionIndex) => doc.text(`   ${String.fromCharCode(65 + optionIndex)}. ${clean(option)}`)); doc.moveDown(0.6); });
    doc.addPage(); doc.font("Helvetica-Bold").fontSize(14).text("ANSWER KEY"); doc.moveDown(0.7).font("Helvetica").fontSize(10).text(quiz.questions.map((q, index) => `${index + 1}-${String.fromCharCode(65 + Number(q.correct_option_id || 0))}`).join("   ")); doc.end();
  });
}

async function createQuizAssignment(incoming, target, quiz, passScore, plan) {
  return (await store("insert_assignment", { assignment: { staff_chat_id: Number(incoming.chatId), target_id: target?.id || null, target_chat_id: Number(target?.chat_id || incoming.chatId), target_title: target?.title || STAFF_TITLE, created_by: Number(incoming.message?.from?.id || 0) || null, title: quiz.title, body: `${quiz.questions.length} ta interactive Telegram quiz`, assignment_type: "quiz", status: "scheduled", send_at: plan.sendAt, deadline_at: plan.deadlineAt, remind_at: plan.reminderAt, requires_submission: Boolean(target), total_items: quiz.questions.length, pass_score: passScore, payload: { questions: quiz.questions, level: quiz.level || null } } })).assignment;
}

async function sendQuizAssignmentNow(assignment, { specialistPreview = false } = {}) {
  const questions = assignment.payload?.questions || [];
  const chatId = Number(assignment.target_chat_id);
  let header = null;
  if (specialistPreview) await sendAgentMessage("teacher", chatId, `📚 ${assignment.title}\n${questions.length} ta savol • Pass ${assignment.pass_score}/${questions.length}`);
  else header = await telegram("sendMessage", { chat_id: chatId, text: `📚 <b>${html(assignment.title)}</b>\n${questions.length} ta savol • <b>Pass ${assignment.pass_score}/${questions.length}</b>${assignment.deadline_at ? `\n⏰ Deadline: ${new Intl.DateTimeFormat("uz-UZ", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(assignment.deadline_at))}` : ""}`, parse_mode: "HTML" });
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const payload = { chat_id: chatId, question: clean(q.question).slice(0, 300), options: (q.options || []).slice(0, 4).map(option => clean(option).slice(0, 100)), type: "quiz", correct_option_id: Number(q.correct_option_id), explanation: clean(q.explanation || "").slice(0, 200), is_anonymous: specialistPreview };
    const pollMessage = specialistPreview ? await sendAgentQuizPoll("teacher", payload) : await telegram("sendPoll", payload);
    if (!specialistPreview && pollMessage?.poll?.id) await store("upsert_quiz_poll", { row: { assignment_id: assignment.id, question_no: i + 1, poll_id: pollMessage.poll.id, question: q.question, correct_option_id: Number(q.correct_option_id), points: 1 } });
  }
  const status = specialistPreview ? "preview" : "active";
  const updated = (await store("update_assignment", { id: assignment.id, patch: { status, target_message_id: header?.message_id || null, updated_at: new Date().toISOString() } })).assignment;
  if (!specialistPreview) await store("snapshot_members", { assignment: updated });
  return updated;
}

export async function tryHandleQuizRequest(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!/\b(quiz|mcq|test)\b/i.test(text)) return false;
  if (/writing|essay|mock test|full mock/i.test(text) && !/grammar|vocab|present|past|future|article|preposition|pronoun|to be/i.test(text)) return false;
  const count = requestedCount(text, 10);
  const level = requestedLevel(text);
  const quiz = await generateQuiz({ topic: quizTopic(text), level, count, language: "English", instruction: text });
  const total = quiz.questions.length;
  const passScore = requestedPass(text, total);
  const plan = timePlan(text);
  const wantsPdf = /\bpdf\b/i.test(text);
  const wantsGroup = /(guruh|group|yubor|jo['‘]?nat|send)/i.test(text);
  const matched = wantsGroup ? await matchTarget(text) : { target: null, targets: [], ambiguous: false };
  if (wantsGroup && !matched.target) {
    const names = matched.targets.slice(0, 8).map(item => `• ${item.title}`).join("\n");
    await sendMessage(incoming.chatId, `🧸 Qaysi guruhga yuboray?\n${names}`, incoming.businessConnectionId);
    return true;
  }
  const assignment = await createQuizAssignment(incoming, matched.target, quiz, passScore, plan);
  if (wantsPdf) {
    const pdf = await quizPdf(quiz, passScore);
    const destination = matched.target ? Number(matched.target.chat_id) : Number(incoming.chatId);
    await sendDocument(destination, pdf, `${clean(quiz.title).replace(/[^a-z0-9]+/gi, "_").slice(0, 50) || "ARK_Quiz"}.pdf`, "ARK Education quiz worksheet");
    await store("update_assignment", { id: assignment.id, patch: { status: matched.target ? "active" : "preview", updated_at: new Date().toISOString() } });
    return true;
  }
  const sendNow = new Date(plan.sendAt).getTime() <= Date.now() + 30_000;
  if (!matched.target) { await sendQuizAssignmentNow(assignment, { specialistPreview: true }); return true; }
  if (sendNow) {
    await sendQuizAssignmentNow(assignment);
    await telegram("sendMessage", { chat_id: Number(incoming.chatId), text: `🧸 <b>${html(quiz.title)}</b> quizini ${html(matched.target.title)} guruhiga yubordim.\n<i>${total} ta savol, pass ${passScore}/${total}. Natijani o'zim yig'aman.</i>`, parse_mode: "HTML" });
  } else {
    await telegram("sendMessage", { chat_id: Number(incoming.chatId), text: `🧸 <b>${html(quiz.title)}</b> tayyor. ${html(matched.target.title)} guruhiga belgilangan vaqtda yuboraman.`, parse_mode: "HTML" });
  }
  return true;
}

export async function handleStudentSubmission(message) {
  if (!groupMessage(message) || message?.chat?.title === STAFF_TITLE || message?.from?.is_bot) return false;
  await recordGroupMember(message);
  const submission = fileFromMessage(message);
  if (!submission || !["photo", "document"].includes(submission.kind)) return false;
  const data = await store("get_active_assignments", { chat_id: Number(message.chat.id) });
  const assignments = data.assignments || [];
  if (!assignments.length) return false;
  let assignment = null;
  if (message.reply_to_message?.message_id) assignment = assignments.find(item => Number(item.target_message_id) === Number(message.reply_to_message.message_id)) || null;
  if (!assignment && assignments.length === 1) assignment = assignments[0];
  if (!assignment && message.caption) { const cap = norm(message.caption); assignment = assignments.find(item => cap.includes(norm(item.title))) || null; }
  if (!assignment) {
    await telegram("sendMessage", { chat_id: Number(message.chat.id), text: "⚙️ <b>Bu rasm qaysi vazifa uchun?</b>\n<i>Hozir bir nechta aktiv vazifa bor. Kerakli vazifa xabariga reply qilib qayta yuboring.</i>", parse_mode: "HTML", reply_to_message_id: message.message_id });
    return true;
  }
  const now = new Date().toISOString();
  const late = Boolean(assignment.deadline_at && new Date(now) > new Date(assignment.deadline_at));
  const user = message.from;
  await store("upsert_submission", { user, row: { assignment_id: assignment.id, chat_id: Number(message.chat.id), student_user_id: Number(user.id), student_name: displayName(user), username: user.username || null, telegram_message_id: Number(message.message_id), submission_kind: submission.kind, telegram_file_id: submission.fileId, caption: message.caption || null, status: "received", is_late: late, submitted_at: now, updated_at: now } });
  await telegram("setMessageReaction", { chat_id: Number(message.chat.id), message_id: Number(message.message_id), reaction: [{ type: "emoji", emoji: late ? "👀" : "👍" }], is_big: false }).catch(() => {});
  return true;
}

export async function handleQuizPollAnswer(update) {
  const answer = update?.poll_answer;
  if (!answer?.poll_id || !answer?.user?.id) return false;
  const data = await store("find_quiz_poll", { poll_id: answer.poll_id });
  const poll = data.poll;
  if (!poll?.assignment_id) return false;
  const selected = Array.isArray(answer.option_ids) && answer.option_ids.length ? Number(answer.option_ids[0]) : null;
  const isCorrect = selected !== null && selected === Number(poll.correct_option_id);
  const assignment = poll.ark_agent_assignments;
  await store("upsert_quiz_answer", { user: answer.user, target_chat_id: assignment?.target_chat_id || null, row: { assignment_id: poll.assignment_id, student_user_id: Number(answer.user.id), question_no: Number(poll.question_no), selected_option_id: selected, is_correct: isCorrect, answered_at: new Date().toISOString() } });
  return true;
}
