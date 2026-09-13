import { telegram } from "../telegram.js";
import { matchTarget } from "./assignment-workflow-v2.js";
import { generateQuiz } from "./openai.js";
import { sendAgentMessage, sendAgentQuizPoll } from "./telegram.js";

const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-agent-store";
const RESULTS_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-quiz-results";
const STAFF_TITLE = "ARK AI STAFF";
const GENERIC_TARGETS = new Set(["test", "quiz", "group", "guruh"]);

function botToken() {
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-token": botToken()
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function store(action, payload = {}) {
  return post(STORE_URL, { action, ...payload });
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function html(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function norm(value = "") {
  return clean(value).toLowerCase().replace(/[ʻ’`]/g, "'").replace(/[^a-z0-9' ]+/g, " ").trim();
}

function requestedCount(text = "", fallback = 10) {
  const patterns = [
    /\b(\d{1,2})\s*ta\s*(?:quiz|test|savol)/i,
    /(?:quiz|test|savol)[^\d]{0,12}(\d{1,2})\s*ta/i,
    /\b(\d{1,2})\s*(?:questions?|savol)/i
  ];
  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match) return Math.max(1, Math.min(20, Number(match[1])));
  }
  return fallback;
}

function requestedLevel(text = "") {
  const match = String(text).match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  return match ? match[1].toUpperCase() : "B1";
}

function requestedPass(text = "", total = 10) {
  const ratio = String(text).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  if (ratio && Number(ratio[2]) === total) return Math.min(total, Math.max(1, Number(ratio[1])));
  const explicit = String(text).match(/(?:pass|o['‘]?tish|chegara)[^\d]{0,12}(\d{1,2})/i);
  if (explicit) return Math.min(total, Math.max(1, Number(explicit[1])));
  return Math.max(1, Math.ceil(total * 0.8));
}

function quizTopic(text = "") {
  return clean(String(text)
    .replace(/\b\d+\s*ta\b/ig, "")
    .replace(/\b(?:quiz|test|mcq|savol)\b/ig, "")
    .replace(/\b(?:yaratib|yarat|tuz|tuzib|qil|tayyorla|ber)\w*\b/ig, "")
    .replace(/\b(?:A1|A2|B1|B2|C1|C2)\b/ig, "")) || "English grammar";
}

function isQuizRequest(text = "") {
  return /\b(quiz|mcq|test)\b/i.test(text)
    && !(/writing|essay|mock test|full mock/i.test(text) && !/grammar|vocab|present|past|future|article|preposition|pronoun|to be/i.test(text));
}

function needsPersistentWorkflow(text = "") {
  return /(guruh|group|yubor|jo['‘]?nat|send|deadline|gacha|ertaga|bugun\s+soat|\bpdf\b)/i.test(text);
}

function isResultsRequest(text = "") {
  const value = String(text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  return /(kim\s+nechta|nechta\s+(?:savol\s+)?(?:yech|ishla)|quiz.*natija|test.*natija|natija.*(?:quiz|test)|score|ballar?)/i.test(value)
    || /natija(?:lar)?(?:ini)?[^.]{0,30}(?:ber|ayt|ko'rsat|chiqar|elon|e'lon)/i.test(value)
    || (/natija/i.test(value) && /(kim|nechta|yech|ishla)/i.test(value));
}

function wantsGroupAnnouncement(text = "") {
  const value = String(text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  const groupScope = /(guruhda|guruhga|guruhida|groupda|groupga|groupida)/i.test(value);
  const publishVerb = /(e'?lon\s*qil|elon\s*qil|announce|chiqar|yubor|jo'nat|aytib\s*qo'y|natijani\s*ayt)/i.test(value);
  return groupScope && publishVerb;
}

async function resultTarget(text = "") {
  const value = String(text || "");
  if (!/(guruh|group|\b909\b|\bielts\b|\bcefr\b|\b404\b)/i.test(value)) return null;
  const matched = await matchTarget(value);
  if (!matched?.target) return null;
  const title = norm(matched.target.title);
  if (GENERIC_TARGETS.has(title) && !new RegExp(`\\b${title}\\s+(?:guruh|group)`, "i").test(value)) return null;
  return matched.target;
}

function resultLines(assignment, rows, summary) {
  const total = Number(assignment.total_items || 0);
  const passScore = Number(assignment.pass_score || 0);
  const lines = [
    `📊 ${assignment.title} — natija`,
    `Pass: ${passScore}/${total}`,
    `Qatnashdi: ${summary.started || 0} • Tugatdi: ${summary.completed || 0} • PASS: ${summary.passed || 0} • RETRY: ${summary.retry || 0}`,
    ""
  ];

  rows.forEach((row, index) => {
    const name = row.username ? `${row.student_name} (@${row.username})` : row.student_name;
    const marker = row.status === "PASS" ? "✅" : row.status === "RETRY" ? "🔁" : row.status === "INCOMPLETE" ? "⏳" : "—";
    lines.push(`${index + 1}. ${name} — ${row.correct}/${total} • ${row.answered}/${total} answered • ${row.status} ${marker}`);
  });
  return lines;
}

function publicResultHtml(assignment, rows, summary) {
  const total = Number(assignment.total_items || 0);
  const passScore = Number(assignment.pass_score || 0);
  const started = rows.filter(row => Number(row.answered || 0) > 0);
  const lines = [
    `🏆 <b>${html(assignment.title)} — NATIJALAR</b>`,
    `Pass: <b>${passScore}/${total}</b>`,
    `Qatnashdi: <b>${summary.started || 0}</b> • Tugatdi: <b>${summary.completed || 0}</b>`,
    ""
  ];

  started.forEach((row, index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
    const status = row.status === "PASS" ? "✅ PASS" : row.status === "RETRY" ? "🔁 RETRY" : "⏳ INCOMPLETE";
    lines.push(`${medal} ${html(row.student_name)} — <b>${row.correct}/${total}</b> • ${status}`);
  });

  if (!started.length) lines.push("Hali hech kim quizga javob bermagan.");
  return lines.join("\n");
}

export async function tryHandleLocalQuizPreview(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!isQuizRequest(text) || needsPersistentWorkflow(text)) return false;

  const count = requestedCount(text, 10);
  const level = requestedLevel(text);
  const topic = quizTopic(text);
  const quiz = await generateQuiz({ topic, level, count, language: "English", instruction: text });
  const total = quiz.questions.length;
  const passScore = requestedPass(text, total);
  const chatId = Number(incoming.chatId);

  const assignment = (await store("insert_assignment", {
    assignment: {
      staff_chat_id: chatId,
      target_chat_id: chatId,
      target_title: STAFF_TITLE,
      created_by: Number(incoming.message?.from?.id || 0) || null,
      title: quiz.title,
      body: `${total} ta tracked interactive Telegram quiz`,
      assignment_type: "quiz",
      status: "active",
      send_at: new Date().toISOString(),
      deadline_at: null,
      remind_at: null,
      requires_submission: false,
      total_items: total,
      pass_score: passScore,
      payload: { questions: quiz.questions, level: quiz.level || level, local_staff_quiz: true }
    }
  })).assignment;

  await sendAgentMessage("teacher", chatId, `📚 ${quiz.title}\n${total} ta savol • Pass ${passScore}/${total}\nNatijalar avtomatik hisoblanadi.`);

  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    const pollMessage = await sendAgentQuizPoll("teacher", {
      chat_id: chatId,
      question: clean(question.question).slice(0, 300),
      options: (question.options || []).slice(0, 4).map(option => clean(option).slice(0, 100)),
      type: "quiz",
      correct_option_id: Number(question.correct_option_id),
      explanation: clean(question.explanation || "").slice(0, 200),
      is_anonymous: false
    });
    if (pollMessage?.poll?.id) {
      await store("upsert_quiz_poll", {
        row: {
          assignment_id: assignment.id,
          question_no: index + 1,
          poll_id: pollMessage.poll.id,
          question: question.question,
          correct_option_id: Number(question.correct_option_id),
          points: 1
        }
      });
    }
  }

  return true;
}

export async function tryHandleLocalQuizResults(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!isResultsRequest(text)) return false;

  const target = await resultTarget(text);
  const publishToGroup = wantsGroupAnnouncement(text);
  const payload = { staff_chat_id: Number(incoming.chatId) };
  if (target?.chat_id) payload.target_chat_id = Number(target.chat_id);

  const data = await post(RESULTS_URL, payload);
  if (!data.assignment) {
    await sendAgentMessage("analyst", incoming.chatId, target
      ? `📊 ${target.title} uchun kuzatilgan quiz natijasi topilmadi.`
      : "📊 Hali kuzatilgan quiz natijasi yo'q.\nYangi quiz yaratsangiz, keyingi javoblar avtomatik hisoblanadi.");
    return true;
  }

  const assignment = data.assignment;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const summary = data.summary || {};

  if (publishToGroup) {
    const destination = target?.chat_id || (Number(assignment.target_chat_id) !== Number(incoming.chatId) ? assignment.target_chat_id : null);
    if (!destination) {
      await sendAgentMessage("analyst", incoming.chatId, "📊 Natijani qaysi student guruhida e'lon qilishni aniq yozing.");
      return true;
    }
    await telegram("sendMessage", {
      chat_id: Number(destination),
      text: publicResultHtml(assignment, rows, summary),
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
    await sendAgentMessage("analyst", incoming.chatId, `📊 ${assignment.target_title || target?.title || "Guruh"}da quiz natijalarini e'lon qildim.`);
    return true;
  }

  if (!rows.length) {
    await sendAgentMessage("analyst", incoming.chatId, `📊 ${assignment.title}\nHali hech kim quizga javob bermagan.`);
    return true;
  }

  await sendAgentMessage("analyst", incoming.chatId, resultLines(assignment, rows, summary).join("\n"));
  return true;
}
