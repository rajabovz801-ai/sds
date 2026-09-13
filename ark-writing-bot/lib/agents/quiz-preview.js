import { generateQuiz } from "./openai.js";
import { sendAgentMessage, sendAgentQuizPoll } from "./telegram.js";

const STORE_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-agent-store";
const RESULTS_URL = "https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark-quiz-results";
const STAFF_TITLE = "ARK AI STAFF";

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
    || (/natija/i.test(value) && /(kim|nechta|yech|ishla)/i.test(value));
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

  const data = await post(RESULTS_URL, { staff_chat_id: Number(incoming.chatId) });
  if (!data.assignment) {
    await sendAgentMessage("analyst", incoming.chatId, "📊 Hali kuzatilgan quiz natijasi yo'q.\nYangi quiz yaratsangiz, keyingi javoblar avtomatik hisoblanadi.");
    return true;
  }

  const assignment = data.assignment;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const summary = data.summary || {};
  const total = Number(assignment.total_items || 0);
  const passScore = Number(assignment.pass_score || 0);

  if (!rows.length) {
    await sendAgentMessage("analyst", incoming.chatId, `📊 ${assignment.title}\nHali hech kim quizga javob bermagan.`);
    return true;
  }

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

  await sendAgentMessage("analyst", incoming.chatId, lines.join("\n"));
  return true;
}
