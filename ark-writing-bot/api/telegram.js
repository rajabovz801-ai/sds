import { waitUntil } from "@vercel/functions";
import mammoth from "mammoth";
import { getTelegramFile, sendDocument, sendMessage } from "../lib/telegram.js";
import {
  answerStudentMessage,
  assessEssayFromImage,
  assessEssayFromPdf,
  assessEssayFromText
} from "../lib/openai.js";
import { createFeedbackPdf } from "../lib/pdf.js";

export const config = {
  api: { bodyParser: true }
};

function getIncoming(update) {
  const message = update.business_message || update.message;
  if (!message) return null;
  return {
    message,
    chatId: message.chat?.id,
    chatType: message.chat?.type || "private",
    businessConnectionId: message.business_connection_id || null,
    studentName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Student"
  };
}

function wordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function looksLikeEssay(text = "") {
  const words = wordCount(text);
  if (words >= 130) return true;
  return /\b(task\s*[12]|essay|introduction|body\s*[12]|conclusion|to what extent|discuss both views|advantages? and disadvantages?)\b/i.test(text) && words >= 70;
}

function mimeFromName(name = "") {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function isGroupChat(chatType = "") {
  return chatType === "group" || chatType === "supergroup";
}

function isGroupServiceMessage(message) {
  return Boolean(
    message?.new_chat_members?.length ||
    message?.left_chat_member ||
    message?.new_chat_title ||
    message?.new_chat_photo ||
    message?.delete_chat_photo ||
    message?.group_chat_created ||
    message?.supergroup_chat_created ||
    message?.channel_chat_created ||
    message?.migrate_to_chat_id ||
    message?.migrate_from_chat_id ||
    message?.pinned_message
  );
}

function shouldRespondInGroup(message) {
  const text = String(message?.text || message?.caption || "");
  if (!text) return false;
  if (/^\/(start|help|status)(?:@ArkTutorBot)?\b/i.test(text)) return true;
  if (/\b@ArkTutorBot\b/i.test(text)) return true;
  if (message?.reply_to_message?.from?.is_bot) return true;
  return false;
}

async function finishAssessment({ assessment, chatId, businessConnectionId, studentName }) {
  const summary = [
    `Tekshirib bo'ldim ✅`,
    `Estimated Band: ${assessment.estimated_band ?? "-"}`,
    `TR/TA: ${assessment.task_response?.band ?? "-"} | CC: ${assessment.coherence_cohesion?.band ?? "-"}`,
    `LR: ${assessment.lexical_resource?.band ?? "-"} | GRA: ${assessment.grammar_accuracy?.band ?? "-"}`,
    `Batafsil feedback PDF ichida.`
  ].join("\n");

  await sendMessage(chatId, summary, businessConnectionId);
  const pdf = await createFeedbackPdf(assessment, studentName);
  const cleanName = studentName.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "student";
  await sendDocument(
    chatId,
    pdf,
    `${cleanName}_writing_feedback.pdf`,
    "Writing feedback",
    businessConnectionId
  );
}

async function handleText(incoming, text) {
  const { chatId, businessConnectionId, studentName } = incoming;

  if (looksLikeEssay(text)) {
    await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
    const assessment = await assessEssayFromText(text);
    await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
    return;
  }

  const reply = await answerStudentMessage(text);
  await sendMessage(chatId, reply, businessConnectionId);
}

async function handleDocument(incoming, document, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  const filename = document.file_name || "submission";
  const lower = filename.toLowerCase();

  await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
  const { buffer } = await getTelegramFile(document.file_id);
  let assessment;

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();
    if (!text) throw new Error("Word file did not contain readable text");
    assessment = await assessEssayFromText(text, caption);
  } else if (lower.endsWith(".pdf")) {
    assessment = await assessEssayFromPdf(buffer, filename, caption);
  } else if (lower.endsWith(".txt")) {
    assessment = await assessEssayFromText(buffer.toString("utf8"), caption);
  } else {
    await sendMessage(
      chatId,
      "Hozircha Word (.docx), PDF, TXT yoki rasm yuboring.",
      businessConnectionId
    );
    return;
  }

  await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
}

async function handlePhoto(incoming, photo, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
  const largest = photo[photo.length - 1];
  const { buffer, filePath } = await getTelegramFile(largest.file_id);
  const assessment = await assessEssayFromImage(buffer, mimeFromName(filePath), caption);
  await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
}

async function processUpdate(update) {
  try {
    const incoming = getIncoming(update);
    if (!incoming?.chatId) return;

    const { message, chatType } = incoming;

    // Teddy Tutor must stay silent when it is added/removed or when other group service events happen.
    if (isGroupChat(chatType) && isGroupServiceMessage(message)) return;

    // In groups, do not react to normal conversation. Only explicit mention/reply/command may trigger a response.
    if (isGroupChat(chatType) && !shouldRespondInGroup(message)) return;

    if (message.text) {
      await handleText(incoming, message.text);
    } else if (message.document) {
      await handleDocument(incoming, message.document, message.caption || "");
    } else if (message.photo?.length) {
      await handlePhoto(incoming, message.photo, message.caption || "");
    } else if (!isGroupChat(chatType)) {
      await sendMessage(
        incoming.chatId,
        "Matn, Word (.docx), PDF yoki essay rasmini yuboring.",
        incoming.businessConnectionId
      );
    }
  } catch (error) {
    console.error(error);
    try {
      const incoming = getIncoming(update);
      if (incoming?.chatId && !isGroupChat(incoming.chatType)) {
        await sendMessage(
          incoming.chatId,
          "Tekshirishda texnik muammo chiqdi. Faylni yoki matnni qayta yuborib ko'ring.",
          incoming.businessConnectionId
        );
      }
    } catch (sendError) {
      console.error("Failed to send error message", sendError);
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "ARK Writing Bot" });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const received = req.headers["x-telegram-bot-api-secret-token"];
    if (received !== expectedSecret) return res.status(401).json({ ok: false });
  }

  const update = req.body || {};
  waitUntil(processUpdate(update));
  return res.status(200).json({ ok: true });
}
