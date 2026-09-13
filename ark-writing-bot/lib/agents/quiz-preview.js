import { generateQuiz } from "./openai.js";
import { sendAgentMessage, sendAgentQuizPoll } from "./telegram.js";

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

  await sendAgentMessage("teacher", chatId, `📚 ${quiz.title}\n${total} ta savol • Pass ${passScore}/${total}`);

  for (const question of quiz.questions) {
    await sendAgentQuizPoll("teacher", {
      chat_id: chatId,
      question: clean(question.question).slice(0, 300),
      options: (question.options || []).slice(0, 4).map(option => clean(option).slice(0, 100)),
      type: "quiz",
      correct_option_id: Number(question.correct_option_id),
      explanation: clean(question.explanation || "").slice(0, 200),
      is_anonymous: true
    });
  }

  return true;
}
