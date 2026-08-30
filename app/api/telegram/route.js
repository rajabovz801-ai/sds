import { waitUntil } from "@vercel/functions";
import mammoth from "mammoth";
import {
  getBusinessConnection,
  getTelegramFile,
  readBusinessMessage,
  sendDocument,
  sendMessage
} from "../../../ark-writing-bot/lib/telegram.js";
import {
  assessEssayFromImage,
  assessEssayFromPdf,
  assessEssayFromText
} from "../../../ark-writing-bot/lib/openai.js";
import { answerGeneralMessage } from "../../../ark-writing-bot/lib/general-chat.js";
import {
  getConversationHistory,
  saveConversationTurn
} from "../../../ark-writing-bot/lib/memory.js";
import { createFeedbackPdf } from "../../../ark-writing-bot/lib/pdf.js";

export const runtime = "nodejs";
export const maxDuration = 60;

function getIncoming(update) {
  const message = update.business_message || update.message;
  if (!message) return null;
  return {
    message,
    isBusiness: Boolean(update.business_message),
    chatId: message.chat?.id,
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

async function isIncomingCustomerMessage(incoming) {
  const { message, isBusiness, businessConnectionId } = incoming;
  if (message.sender_business_bot || message.from?.is_bot) return false;
  if (!isBusiness || !businessConnectionId) return true;

  try {
    const connection = await getBusinessConnection(businessConnectionId);
    const ownerId = connection?.user?.id;
    if (ownerId && message.from?.id === ownerId) return false;
  } catch (error) {
    console.warn("Could not resolve business connection owner", error);
  }
  return true;
}

async function markRead(incoming) {
  if (!incoming.isBusiness || !incoming.businessConnectionId || !incoming.message?.message_id) return;
  try {
    await readBusinessMessage(
      incoming.businessConnectionId,
      incoming.chatId,
      incoming.message.message_id
    );
  } catch (error) {
    console.warn("Could not mark business message as read", error);
  }
}

async function finishAssessment({ assessment, chatId, businessConnectionId, studentName }) {
  const summary = [
    "Tekshirib bo'ldim ✅",
    `Estimated Band: ${assessment.estimated_band ?? "-"}`,
    `TR/TA: ${assessment.task_response?.band ?? "-"} | CC: ${assessment.coherence_cohesion?.band ?? "-"}`,
    `LR: ${assessment.lexical_resource?.band ?? "-"} | GRA: ${assessment.grammar_accuracy?.band ?? "-"}`,
    "Batafsil feedback PDF ichida."
  ].join("\n");

  await sendMessage(chatId, summary, businessConnectionId);
  const pdf = await createFeedbackPdf(assessment, studentName);
  const cleanName = studentName.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "student";
  await sendDocument(chatId, pdf, `${cleanName}_writing_feedback.pdf`, "Writing feedback", businessConnectionId);
}

async function handleText(incoming, text) {
  const { chatId, businessConnectionId, studentName } = incoming;

  if (looksLikeEssay(text)) {
    await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
    const assessment = await assessEssayFromText(text);
    await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
    return;
  }

  let history = [];
  try {
    history = await getConversationHistory(businessConnectionId, chatId);
  } catch (error) {
    console.warn("Could not load conversation memory", error);
  }

  const reply = await answerGeneralMessage(text, history);
  await sendMessage(chatId, reply, businessConnectionId);

  try {
    await saveConversationTurn(businessConnectionId, chatId, text, reply);
  } catch (error) {
    console.warn("Could not save conversation memory", error);
  }
}

async function handleDocument(incoming, document, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  const filename = document.file_name || "submission";
  const lower = filename.toLowerCase();

  if (![".docx", ".pdf", ".txt"].some(ext => lower.endsWith(ext))) {
    await sendMessage(chatId, "Faylni oldim 👍 Hozircha Word, PDF yoki TXT fayllarni tahlil qila olaman.", businessConnectionId);
    return;
  }

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
  } else {
    assessment = await assessEssayFromText(buffer.toString("utf8"), caption);
  }

  await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
}

async function handlePhoto(incoming, photo, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  await sendMessage(chatId, "Rasmni oldim, ko'rib chiqaman ✅", businessConnectionId);
  const largest = photo[photo.length - 1];
  const { buffer, filePath } = await getTelegramFile(largest.file_id);
  const assessment = await assessEssayFromImage(buffer, mimeFromName(filePath), caption);
  await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
}

async function processUpdate(update) {
  try {
    const incoming = getIncoming(update);
    if (!incoming?.chatId) return;
    if (!(await isIncomingCustomerMessage(incoming))) return;

    await markRead(incoming);

    const { message } = incoming;
    if (message.text) {
      await handleText(incoming, message.text);
    } else if (message.document) {
      await handleDocument(incoming, message.document, message.caption || "");
    } else if (message.photo?.length) {
      await handlePhoto(incoming, message.photo, message.caption || "");
    } else if (message.voice || message.audio) {
      await sendMessage(incoming.chatId, "Voice/audio xabaringizni oldim 👍 Hozircha javob uchun qisqacha matn qilib yozib yuboring.", incoming.businessConnectionId);
    } else if (message.sticker) {
      await sendMessage(incoming.chatId, "😄👍", incoming.businessConnectionId);
    } else {
      await sendMessage(incoming.chatId, "Xabaringizni oldim 👍", incoming.businessConnectionId);
    }
  } catch (error) {
    console.error("ARK bot processing error", error);
    try {
      const incoming = getIncoming(update);
      if (incoming?.chatId && !incoming.message?.sender_business_bot) {
        await sendMessage(incoming.chatId, "Hozir texnik muammo chiqdi. Xabarni birozdan keyin qayta yuborib ko'ring.", incoming.businessConnectionId);
      }
    } catch (sendError) {
      console.error("Failed to send bot error message", sendError);
    }
  }
}

export async function GET() {
  return Response.json({ ok: true, service: "ARK Writing Bot", ready: true });
}

export async function POST(request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expectedSecret) {
      return Response.json({ ok: false }, { status: 401 });
    }
  }

  const update = await request.json();
  waitUntil(processUpdate(update));
  return Response.json({ ok: true });
}
