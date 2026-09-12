import mammoth from "mammoth";
import {
  assessEssayFromImage,
  assessEssayFromPdf,
  assessEssayFromText
} from "../openai.js";
import { createFeedbackPdf } from "../pdf.js";
import {
  getAgentTelegramFile,
  sendAgentChatAction,
  sendAgentDocument,
  sendAgentMessage,
  sendAgentSticker
} from "./telegram.js";

function safeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanFilename(value = "student") {
  return String(value || "student")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "student";
}

function studentName(message) {
  return [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(" ") || "Student";
}

function mimeFromName(name = "") {
  const lower = String(name).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function band(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "-";
}

function correctionPreview(assessment) {
  const corrections = Array.isArray(assessment?.corrections) ? assessment.corrections : [];
  if (!corrections.length) return "Aniq grammatik/leksik xato ro'yxati topilmadi yoki matn yetarli emas.";

  return corrections.slice(0, 5).map((item, index) => {
    const original = safeText(item?.original).slice(0, 220) || "-";
    const corrected = safeText(item?.corrected).slice(0, 220) || "-";
    const reason = safeText(item?.reason).slice(0, 260) || "Izoh berilmagan";
    return `${index + 1}. ${original}\n→ ${corrected}\nSabab: ${reason}`;
  }).join("\n\n");
}

function resultMessage(assessment) {
  const corrections = Array.isArray(assessment?.corrections) ? assessment.corrections : [];
  const priorities = Array.isArray(assessment?.top_priorities) ? assessment.top_priorities.filter(Boolean).slice(0, 3) : [];

  const lines = [
    "📝 ARK Checker",
    "✅ Writing tekshirildi.",
    "",
    `🔴 Birinchi xatolar (${corrections.length} ta muhim correction):`,
    correctionPreview(assessment),
    "",
    "📊 IELTS natija:",
    `Overall: ${band(assessment?.estimated_band)}`,
    `Task Achievement/Response: ${band(assessment?.task_response?.band)}`,
    `Coherence & Cohesion: ${band(assessment?.coherence_cohesion?.band)}`,
    `Lexical Resource: ${band(assessment?.lexical_resource?.band)}`,
    `Grammar Range & Accuracy: ${band(assessment?.grammar_accuracy?.band)}`
  ];

  if (priorities.length) {
    lines.push("", "📌 Keyingi Writing uchun asosiy fokus:");
    priorities.forEach((item, index) => lines.push(`${index + 1}. ${safeText(item)}`));
  }

  lines.push("", "📎 Batafsil o'zbekcha feedback PDF faylda.");
  return lines.join("\n");
}

async function sendStarted(chatId) {
  const stickerId = process.env.ARK_CHECKER_STICKER_FILE_ID || "";
  if (stickerId) {
    await sendAgentSticker("checker", chatId, stickerId).catch(() => {});
  }
  await sendAgentChatAction("checker", chatId, "typing").catch(() => {});
  await sendAgentMessage(
    "checker",
    chatId,
    "✍️ Writing olindi. Avval xatolarni tekshiryapman, keyin band score va PDF feedback beraman."
  );
}

async function finish(chatId, assessment, message) {
  await sendAgentChatAction("checker", chatId, "typing").catch(() => {});
  await sendAgentMessage("checker", chatId, resultMessage(assessment));

  const name = studentName(message);
  const pdf = await createFeedbackPdf(assessment, name);
  await sendAgentChatAction("checker", chatId, "upload_document").catch(() => {});
  await sendAgentDocument(
    "checker",
    chatId,
    pdf,
    `${cleanFilename(name)}_ARK_Writing_Feedback.pdf`,
    "ARK Writing Feedback — xatolar, band tahlili va keyingi fokus"
  );
}

async function assessDocument(message) {
  const document = message.document;
  const filename = document?.file_name || "submission";
  const lower = filename.toLowerCase();
  const supported = [".docx", ".pdf", ".txt"].some(ext => lower.endsWith(ext));
  if (!supported) {
    await sendAgentMessage(
      "checker",
      message.chat.id,
      "Bu fayl formatini hozir Writing uchun ocholmayman. DOCX, PDF, TXT yoki rasm yuboring."
    );
    return true;
  }

  await sendStarted(message.chat.id);
  const { buffer } = await getAgentTelegramFile("checker", document.file_id);
  const context = message.caption || "";
  let assessment;

  if (lower.endsWith(".docx")) {
    const extracted = await mammoth.extractRawText({ buffer });
    const text = extracted.value?.trim();
    if (!text) throw new Error("DOCX ichida o'qiladigan matn topilmadi");
    assessment = await assessEssayFromText(text, context);
  } else if (lower.endsWith(".pdf")) {
    assessment = await assessEssayFromPdf(buffer, filename, context);
  } else {
    const text = buffer.toString("utf8").trim();
    if (!text) throw new Error("TXT ichida matn topilmadi");
    assessment = await assessEssayFromText(text, context);
  }

  await finish(message.chat.id, assessment, message);
  return true;
}

async function assessPhoto(message) {
  const photos = message.photo || [];
  if (!photos.length) return false;
  const largest = photos[photos.length - 1];

  await sendStarted(message.chat.id);
  const { buffer, filePath } = await getAgentTelegramFile("checker", largest.file_id);
  const assessment = await assessEssayFromImage(buffer, mimeFromName(filePath), message.caption || "");
  await finish(message.chat.id, assessment, message);
  return true;
}

export async function handleCheckerWritingSubmission(message) {
  if (!message?.chat?.id) return false;

  try {
    if (message.document) return await assessDocument(message);
    if (message.photo?.length) return await assessPhoto(message);
    return false;
  } catch (error) {
    console.error("ARK Checker writing submission failed", error);
    await sendAgentMessage(
      "checker",
      message.chat.id,
      `⚠️ Writingni tekshirishda texnik muammo chiqdi: ${String(error?.message || "unknown error").slice(0, 250)}`
    ).catch(() => {});
    return true;
  }
}
