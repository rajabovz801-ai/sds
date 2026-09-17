import { waitUntil } from "@vercel/functions";
import {
  isGroupMessage,
  isStaffChat
} from "../../../../ark-writing-bot/lib/agents/config.js";
import {
  handleQuizPollAnswer,
  handleStudentSubmission,
  recordGroupMember
} from "../../../../ark-writing-bot/lib/agents/assignment-workflow-v2.js";
import { handleStaffManagerMessage } from "../../../../ark-writing-bot/lib/agents/manager.js";
import { telegram } from "../../../../ark-writing-bot/lib/telegram.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLATFORM_URL = process.env.ARK_ENGLISH_WEBAPP_URL || "https://ark-video.vercel.app";

function incomingFrom(update) {
  const message = update?.business_message || update?.message;
  if (!message) return null;
  return {
    message,
    isBusiness: Boolean(update.business_message),
    chatId: message.chat?.id,
    businessConnectionId: message.business_connection_id || null,
    studentName: [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "Student"
  };
}

function cleanName(value, max = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseField(text, field) {
  const match = String(text || "").match(new RegExp(`^${field}:\\s*(.+)$`, "mi"));
  return cleanName(match?.[1] || "");
}

function isPrivateMessage(message) {
  return message?.chat?.type === "private";
}

async function studentAccess(origin, payload) {
  const secret = (process.env.BOT_REGISTRATION_SECRET || "").trim();
  if (!secret) throw new Error("BOT_REGISTRATION_SECRET is missing");
  const response = await fetch(`${origin}/api/bot/student-access`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ark-bot-secret": secret,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Student access xatoligi");
  return data;
}

async function sendFirstNamePrompt(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "🏛 <b>Ark Education | English</b>",
      "",
      "Ark Education’ning English platformasiga xush kelibsiz!",
      "Platformadan foydalanish uchun avval qisqa ro‘yxatdan o‘ting.",
      "",
      "Ismingizni yozing:",
      "<i>Masalan: Rustam</i>",
    ].join("\n"),
    parse_mode: "HTML",
    reply_markup: {
      force_reply: true,
      selective: true,
      input_field_placeholder: "Ismingiz",
    },
  });
}

async function sendSurnamePrompt(chatId, firstName) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "✅ Ismingiz qabul qilindi.",
      "",
      `Ism: ${firstName}`,
      "",
      "Endi familiyangizni yozing:",
      "Masalan: Usmonov",
    ].join("\n"),
    reply_markup: {
      force_reply: true,
      selective: true,
      input_field_placeholder: "Familiyangiz",
    },
  });
}

async function sendConfirmation(chatId, firstName, lastName) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "👤 Ma’lumotlaringizni tekshiring:",
      "",
      `Ism: ${firstName}`,
      `Familiya: ${lastName}`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: "english_reg_confirm" },
        { text: "✏️ Tahrirlash", callback_data: "english_reg_edit" },
      ]],
    },
  });
}

async function sendPlatformEntry(chatId, student, platformToken, justRegistered = false) {
  const fullName = [student?.firstName, student?.lastName].filter(Boolean).join(" ").trim();
  const url = `${PLATFORM_URL}${PLATFORM_URL.includes("?") ? "&" : "?"}token=${encodeURIComponent(platformToken)}`;
  const text = justRegistered
    ? [
        "✅ <b>Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi</b>",
        "",
        fullName ? `👤 ${fullName}` : "",
        "Ark Education’ning English platformasiga xush kelibsiz!",
        "",
        "Quyidagi <b>🚀 Platformaga kirish</b> tugmasi orqali davom eting.",
      ].filter(Boolean).join("\n")
    : [
        "🏛 <b>Ark Education | English</b>",
        "",
        fullName ? `👋 Xush kelibsiz, <b>${fullName}</b>!` : "👋 Xush kelibsiz!",
        "Dashboard, video darslar, testlar, kitoblar va reyting platforma ichida bo‘ladi.",
        "",
        "Quyidagi <b>🚀 Platformaga kirish</b> tugmasi orqali davom eting.",
      ].join("\n");

  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Platformaga kirish", web_app: { url } },
      ]],
    },
  });
}

async function handlePrivateRegistration(origin, update, incoming) {
  const { message, chatId } = incoming;
  const telegramId = String(message.from?.id || "");
  const username = message.from?.username || null;
  const text = String(message.text || "").trim();

  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
    const profile = await studentAccess(origin, { action: "profile", telegramId, username });
    if (profile?.registered && profile?.student?.status === "active") {
      const access = await studentAccess(origin, { action: "platform", telegramId, username });
      await sendPlatformEntry(chatId, access.student, access.platformToken, false);
    } else if (profile?.student?.status === "blocked") {
      await telegram("sendMessage", { chat_id: chatId, text: "Profilingiz admin tomonidan bloklangan." });
    } else {
      await sendFirstNamePrompt(chatId);
    }
    return true;
  }

  const replyText = String(message.reply_to_message?.text || "");
  if (replyText.includes("Ismingizni yozing:")) {
    const firstName = cleanName(text, 60);
    if (!firstName) {
      await sendFirstNamePrompt(chatId);
      return true;
    }
    await sendSurnamePrompt(chatId, firstName);
    return true;
  }

  if (replyText.includes("Endi familiyangizni yozing:")) {
    const firstName = parseField(replyText, "Ism");
    const lastName = cleanName(text, 80);
    if (!firstName || !lastName) {
      await sendFirstNamePrompt(chatId);
      return true;
    }
    await sendConfirmation(chatId, firstName, lastName);
    return true;
  }

  return false;
}

async function handleRegistrationCallback(origin, update) {
  const callback = update?.callback_query;
  if (!callback) return false;
  const chatId = callback.message?.chat?.id;
  if (!chatId || callback.message?.chat?.type !== "private") return false;

  const telegramId = String(callback.from?.id || "");
  const username = callback.from?.username || null;
  const data = String(callback.data || "");

  if (data === "english_reg_edit") {
    await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Ma’lumotlarni qayta kiriting." });
    await sendFirstNamePrompt(chatId);
    return true;
  }

  if (data === "english_reg_confirm") {
    const source = String(callback.message?.text || "");
    const firstName = parseField(source, "Ism");
    const lastName = parseField(source, "Familiya");
    if (!firstName || !lastName) {
      await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Ma’lumotlar topilmadi. Qayta kiriting." });
      await sendFirstNamePrompt(chatId);
      return true;
    }

    try {
      const registered = await studentAccess(origin, {
        action: "register",
        telegramId,
        username,
        firstName,
        lastName,
      });
      await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Ro‘yxatdan o‘tildi ✅" });
      await sendPlatformEntry(chatId, registered.student, registered.platformToken, true);
    } catch (error) {
      await telegram("answerCallbackQuery", { callback_query_id: callback.id, text: "Ro‘yxatdan o‘tishda xatolik." });
      throw error;
    }
    return true;
  }

  return false;
}

async function forwardToLegacy(origin, update) {
  const headers = { "content-type": "application/json" };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) headers["x-telegram-bot-api-secret-token"] = secret;

  const response = await fetch(`${origin}/api/telegram`, {
    method: "POST",
    headers,
    body: JSON.stringify(update)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Legacy Teddy route failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function processManagerUpdate(origin, update) {
  if (update?.callback_query) {
    const handled = await handleRegistrationCallback(origin, update);
    if (handled) return;
    await forwardToLegacy(origin, update);
    return;
  }

  if (update?.poll_answer) {
    await handleQuizPollAnswer(update);
    return;
  }

  const incoming = incomingFrom(update);
  if (!incoming?.chatId) {
    await forwardToLegacy(origin, update);
    return;
  }

  const { message } = incoming;
  if (message.from?.is_bot || message.sender_business_bot) return;

  if (isStaffChat(message)) {
    if (message.text || message.caption) await handleStaffManagerMessage(incoming);
    return;
  }

  if (isGroupMessage(message)) {
    await recordGroupMember(message).catch(error => console.warn("Could not learn group member", error?.message || error));
    const handled = await handleStudentSubmission(message).catch(error => {
      console.error("Student submission workflow failed", error);
      return false;
    });
    if (handled) return;

    // Student groups stay quiet by design. Ordinary chat, mentions and side conversations are ignored.
    return;
  }

  if (isPrivateMessage(message)) {
    const handled = await handlePrivateRegistration(origin, update, incoming);
    if (handled) return;
  }

  await forwardToLegacy(origin, update);
}

export async function GET() {
  return Response.json({ ok: true, service: "Teddy Manager", ready: true, quiet_student_groups: true, assignment_tracking: true, ark_english_registration: true });
}

export async function POST(request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expected) return Response.json({ ok: false }, { status: 401 });
  }

  const update = await request.json();
  const origin = new URL(request.url).origin;
  waitUntil(processManagerUpdate(origin, update));
  return Response.json({ ok: true });
}
