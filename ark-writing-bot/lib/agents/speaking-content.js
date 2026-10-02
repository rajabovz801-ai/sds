import { sendDocument, telegram } from "../telegram.js";
import { matchTarget } from "./assignment-workflow-v2.js";
import { runAgent } from "./openai.js";
import { isSpeakingMaterialRequest, buildSpeakingMaterialPrompt } from "./speaking-standards.mjs";
import { renderMaterialPdf } from "./quiz-pdf.mjs";

function parseTopic(text = "") {
  const quoted = String(text).match(/["“”']([^"“”']{2,80})["“”']/);
  if (quoted?.[1]) return quoted[1].replace(/\s+/g, " ").trim();
  const match = String(text).match(/(?:mavzusida|topic\s*[:\-]?|haqida)\s*([A-Za-z][A-Za-z\s&-]{1,55}?)(?=\s+(?:IELTS|Speaking|Part|uchun|bo'yicha|ber)|[,.]|$)/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "surprise me";
}

function asksForStudentDelivery(text = "") {
  return /(guruh|group)/i.test(text) && /(yubor|jo['‘]?nat|send|tashla)/i.test(text);
}

async function sendTextInParts(chatId, text) {
  const paragraphs = String(text || "").split(/\n{2,}/);
  let part = "";
  for (const paragraph of paragraphs) {
    const next = part ? `${part}\n\n${paragraph}` : paragraph;
    if (next.length > 3500 && part) {
      await telegram("sendMessage", { chat_id: chatId, text: part, disable_web_page_preview: true });
      part = paragraph;
    } else {
      part = next;
    }
  }
  if (part) await telegram("sendMessage", { chat_id: chatId, text: part, disable_web_page_preview: true });
}

export async function tryHandleSpeakingContentRequest(incoming) {
  const text = incoming?.message?.text || incoming?.message?.caption || "";
  if (!isSpeakingMaterialRequest(text)) return false;

  const topic = parseTopic(text);
  const material = await runAgent(
    "teacher",
    buildSpeakingMaterialPrompt(topic, text),
    "Create this as a complete, ready-to-use IELTS Speaking practice material. Do not claim old topics were searched."
  );
  const wantsGroup = asksForStudentDelivery(text);
  const matched = wantsGroup ? await matchTarget(text) : { target: null, targets: [] };

  if (wantsGroup && !matched.target) {
    const names = matched.targets.slice(0, 8).map(item => `• ${item.title}`).join("\n");
    await telegram("sendMessage", {
      chat_id: Number(incoming.chatId),
      text: `Qaysi guruhga yuboray?${names ? `\n${names}` : ""}`
    });
    return true;
  }

  const destination = matched.target ? Number(matched.target.chat_id) : Number(incoming.chatId);
  const wantsPdf = /\bpdf\b/i.test(text);
  if (wantsPdf) {
    const pdf = await renderMaterialPdf(`IELTS Speaking — ${topic === "surprise me" ? "Practice" : topic}`, material);
    const safeName = topic.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 42) || "Speaking_Practice";
    await sendDocument(destination, pdf, `${safeName}_Speaking.pdf`, "ARK Education • IELTS Speaking • A4 • Latin Modern");
  } else {
    await sendTextInParts(destination, material);
  }

  if (matched.target) {
    await telegram("sendMessage", { chat_id: Number(incoming.chatId), text: `🧸 Speaking materiali ${matched.target.title} guruhiga yuborildi.` });
  }
  return true;
}
