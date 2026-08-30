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
import {
  createPendingHomework,
  getPendingHomework,
  logHomework,
  logIncomingMessage,
  resolvePendingHomework,
  saveTeacherIdentity
} from "../../../ark-writing-bot/lib/tracker.js";
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

function detectAssignmentType(text = "") {
  const value = text.toLowerCase().replace(/[’ʻ`]/g, "'");
  if (/\b(writing|essay|task\s*1|task\s*2)\b/.test(value)) return "Writing";
  if (/\b(reading|reading tahlil|reading analysis)\b/.test(value)) return "Reading tahlil";
  if (/\b(listening|listening tahlil|listening analysis)\b/.test(value)) return "Listening";
  if (/\b(speaking|speaking practice)\b/.test(value)) return "Speaking";
  if (/\b(vocabulary|vocab|lug['‘]?at|lugat)\b/.test(value)) return "Vocabulary";
  if (/\b(grammar|grammatika)\b/.test(value)) return "Grammar";
  if (/\b(mock|test)\b/.test(value)) return "Test/Mock";
  if (/\b(homework|uyga vazifa|vazifa)\b/.test(value)) return "Homework";
  return null;
}

function asksForCheck(text = "") {
  return /(tekshir|tekshirib|tekshirasiz|check|bahola|baholab|band|score|xato(?:lar)?ni ko['‘]?r)/i.test(text);
}

function looksLikeSubmissionText(text = "") {
  const type = detectAssignmentType(text);
  if (!type) return false;
  if (/\?\s*$/.test(text.trim())) return false;
  return /(qildim|qilib bo['‘]?ldim|tayyor|yubordim|tashladim|jo['‘]?natdim|mana|topshirdim)/i.test(text);
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
    if (ownerId) {
      try {
        await saveTeacherIdentity(ownerId, businessConnectionId);
      } catch (storeError) {
        console.warn("Could not save teacher identity", storeError?.message || storeError);
      }
    }
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

async function rememberTurn(incoming, userText, reply) {
  try {
    await saveConversationTurn(incoming.businessConnectionId, incoming.chatId, userText, reply);
  } catch (error) {
    console.warn("Could not save conversation memory", error);
  }
}

async function handleText(incoming, text) {
  const { chatId, businessConnectionId, studentName } = incoming;

  if (looksLikeEssay(text)) {
    await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
    const assessment = await assessEssayFromText(text);
    try {
      await logHomework(incoming, {
        assignmentType: "Writing",
        submissionKind: "text",
        description: "Essay matn ko'rinishida yuborildi va tekshirildi",
        status: "checked"
      });
    } catch (error) {
      console.warn("Could not log checked essay", error?.message || error);
    }
    await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
    return;
  }

  let pending = null;
  try {
    pending = await getPendingHomework(incoming);
  } catch (error) {
    console.warn("Could not load pending homework", error?.message || error);
  }

  if (pending) {
    const assignmentType = detectAssignmentType(text);
    const pendingAge = Date.now() - new Date(pending.created_at).getTime();

    if (assignmentType) {
      if (assignmentType === "Writing" && asksForCheck(text) && pending.telegram_file_id) {
        await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
        const { buffer, filePath } = await getTelegramFile(pending.telegram_file_id);
        const assessment = await assessEssayFromImage(buffer, mimeFromName(filePath), pending.caption || text);
        await resolvePendingHomework(pending.id, "Writing", "checked", "Writing rasmi tekshirildi");
        await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
        return;
      }

      await resolvePendingHomework(pending.id, assignmentType, "received", text);
      const reply = `${assignmentType} vazifasi qabul qilindi ✅`;
      await sendMessage(chatId, reply, businessConnectionId);
      await rememberTurn(incoming, text, reply);
      return;
    }

    if (Number.isFinite(pendingAge) && pendingAge < 15 * 60 * 1000 && wordCount(text) <= 8) {
      const reply = "Tushundim. Bu qaysi vazifa ekanini qisqa yozib yuboring: writing, reading tahlil, listening yoki boshqa.";
      await sendMessage(chatId, reply, businessConnectionId);
      await rememberTurn(incoming, text, reply);
      return;
    }
  }

  if (looksLikeSubmissionText(text)) {
    const assignmentType = detectAssignmentType(text) || "Homework";
    try {
      await logHomework(incoming, {
        assignmentType,
        submissionKind: "message",
        description: text,
        status: "received"
      });
    } catch (error) {
      console.warn("Could not log homework message", error?.message || error);
    }
    const reply = `${assignmentType} vazifasi qabul qilindi ✅`;
    await sendMessage(chatId, reply, businessConnectionId);
    await rememberTurn(incoming, text, reply);
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
  await rememberTurn(incoming, text, reply);
}

async function handleDocument(incoming, document, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  const filename = document.file_name || "submission";
  const lower = filename.toLowerCase();

  if (![".docx", ".pdf", ".txt"].some(ext => lower.endsWith(ext))) {
    await sendMessage(chatId, "Faylni oldim 👍 Hozircha Word, PDF yoki TXT fayllarni tahlil qila olaman.", businessConnectionId);
    return;
  }

  const assignmentType = detectAssignmentType(caption);
  if (assignmentType && !asksForCheck(caption)) {
    try {
      await logHomework(incoming, {
        assignmentType,
        submissionKind: "document",
        description: filename,
        status: "received",
        fileId: document.file_id,
        caption
      });
    } catch (error) {
      console.warn("Could not log homework document", error?.message || error);
    }
    await sendMessage(chatId, `${assignmentType} vazifasi qabul qilindi ✅`, businessConnectionId);
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

  try {
    await logHomework(incoming, {
      assignmentType: "Writing",
      submissionKind: "document",
      description: filename,
      status: "checked",
      fileId: document.file_id,
      caption
    });
  } catch (error) {
    console.warn("Could not log checked document", error?.message || error);
  }

  await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
}

async function handlePhoto(incoming, photo, caption = "") {
  const { chatId, businessConnectionId, studentName } = incoming;
  const largest = photo[photo.length - 1];
  const assignmentType = detectAssignmentType(caption);

  if (assignmentType === "Writing" && asksForCheck(caption)) {
    await sendMessage(chatId, "Hozir tekshirib beraman ✅", businessConnectionId);
    const { buffer, filePath } = await getTelegramFile(largest.file_id);
    const assessment = await assessEssayFromImage(buffer, mimeFromName(filePath), caption);
    try {
      await logHomework(incoming, {
        assignmentType: "Writing",
        submissionKind: "photo",
        description: "Writing rasmi yuborildi va tekshirildi",
        status: "checked",
        fileId: largest.file_id,
        caption
      });
    } catch (error) {
      console.warn("Could not log checked photo", error?.message || error);
    }
    await finishAssessment({ assessment, chatId, businessConnectionId, studentName });
    return;
  }

  if (assignmentType) {
    try {
      await logHomework(incoming, {
        assignmentType,
        submissionKind: "photo",
        description: caption || "Rasm ko'rinishida vazifa",
        status: "received",
        fileId: largest.file_id,
        caption
      });
    } catch (error) {
      console.warn("Could not log homework photo", error?.message || error);
    }
    await sendMessage(chatId, `${assignmentType} vazifasi qabul qilindi ✅`, businessConnectionId);
    return;
  }

  try {
    await createPendingHomework(incoming, {
      submissionKind: "photo",
      description: "Vazifa turi aniqlashtirilmoqda",
      fileId: largest.file_id,
      caption
    });
  } catch (error) {
    console.warn("Could not create pending homework", error?.message || error);
  }

  await sendMessage(
    chatId,
    "Rasmni oldim 👍 Bu qaysi vazifa? Writing, reading tahlil, listening yoki boshqa?",
    businessConnectionId
  );
}

async function processUpdate(update) {
  try {
    const incoming = getIncoming(update);
    if (!incoming?.chatId) return;
    if (!(await isIncomingCustomerMessage(incoming))) return;

    await markRead(incoming);

    const { message } = incoming;
    try {
      if (message.text) {
        await logIncomingMessage(incoming, "text", message.text);
      } else if (message.document) {
        await logIncomingMessage(incoming, "document", `${message.document.file_name || "fayl"}${message.caption ? ` — ${message.caption}` : ""}`);
      } else if (message.photo?.length) {
        await logIncomingMessage(incoming, "photo", message.caption || "[rasm]");
      } else if (message.voice) {
        await logIncomingMessage(incoming, "voice", "[voice xabar]");
      } else if (message.audio) {
        await logIncomingMessage(incoming, "audio", "[audio]");
      } else if (message.sticker) {
        await logIncomingMessage(incoming, "sticker", message.sticker.emoji || "[sticker]");
      }
    } catch (error) {
      console.warn("Could not log incoming message", error?.message || error);
    }

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
