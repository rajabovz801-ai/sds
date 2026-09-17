import { waitUntil } from "@vercel/functions";
import { telegram } from "../../../../ark-writing-bot/lib/telegram.js";
import { performStudentAccess } from "../../../../lib/arkEnglishStudentAccess";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLATFORM_URL = process.env.ARK_ENGLISH_WEBAPP_URL || "https://ark-video.vercel.app";

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

async function studentAccess(_origin, payload) {
  const result = await performStudentAccess(payload);
  if (result.status >= 400) throw new Error(result.data?.error || "Student access xatoligi");
  return result.data;
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

async function sendPrivatePlatformFallback(origin, message) {
  // AI private replies are intentionally disabled until the next product phase.
  const chatId = message.chat.id;
  const telegramId = String(message.from?.id || "");
  const username = message.from?.username || null;
  const profile = await studentAccess(origin, { action: "profile", telegramId, username });

  if (!profile?.registered || profile?.student?.status !== "active") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Platformadan foydalanish uchun /start buyrug‘ini bosing.",
    });
    return;
  }

  const access = await studentAccess(origin, { action: "platform", telegramId, username });
  await sendPlatformEntry(chatId, access.student, access.platformToken, false);
}

async function handlePrivateMessage(origin, message) {
  const chatId = message.chat.id;
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
    return;
  }

  const replyText = String(message.reply_to_message?.text || "");
  if (replyText.includes("Ismingizni yozing:")) {
    const firstName = cleanName(text, 60);
    if (!firstName) {
      await sendFirstNamePrompt(chatId);
      return;
    }
    await sendSurnamePrompt(chatId, firstName);
    return;
  }

  if (replyText.includes("Endi familiyangizni yozing:")) {
    const firstName = parseField(replyText, "Ism");
    const lastName = cleanName(text, 80);
    if (!firstName || !lastName) {
      await sendFirstNamePrompt(chatId);
      return;
    }
    await sendConfirmation(chatId, firstName, lastName);
    return;
  }

  await sendPrivatePlatformFallback(origin, message);
}

async function handlePrivateCallback(origin, callback) {
  const chatId = callback.message?.chat?.id;
  if (!chatId || callback.message?.chat?.type !== "private") return false;

  const telegramId = String(callback.from?.id || "");
  const username = callback.from?.username || null;
  const data = String(callback.data || "");

  if (data === "english_reg_edit") {
    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Ma’lumotlarni qayta kiriting.",
    });
    await sendFirstNamePrompt(chatId);
    return true;
  }

  if (data === "english_reg_confirm") {
    const source = String(callback.message?.text || "");
    const firstName = parseField(source, "Ism");
    const lastName = parseField(source, "Familiya");
    if (!firstName || !lastName) {
      await telegram("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "Ma’lumotlar topilmadi. Qayta kiriting.",
      });
      await sendFirstNamePrompt(chatId);
      return true;
    }

    const registered = await studentAccess(origin, {
      action: "register",
      telegramId,
      username,
      firstName,
      lastName,
    });
    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Ro‘yxatdan o‘tildi ✅",
    });
    await sendPlatformEntry(chatId, registered.student, registered.platformToken, true);
    return true;
  }

  await telegram("answerCallbackQuery", { callback_query_id: callback.id }).catch(() => {});
  return true;
}

async function forwardToManager(origin, update) {
  const headers = { "content-type": "application/json" };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) headers["x-telegram-bot-api-secret-token"] = secret;

  const response = await fetch(`${origin}/api/telegram/manager`, {
    method: "POST",
    headers,
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Manager route failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function processUpdate(origin, update) {
  const callback = update?.callback_query;
  if (callback?.message?.chat?.type === "private") {
    await handlePrivateCallback(origin, callback);
    return;
  }

  const message = update?.message || update?.business_message;
  if (message && isPrivateMessage(message) && !message.from?.is_bot && !message.sender_business_bot) {
    await handlePrivateMessage(origin, message);
    return;
  }

  await forwardToManager(origin, update);
}

export async function GET() {
  return Response.json({
    ok: true,
    service: "Ark Education | English Telegram Entry",
    ready: true,
    private_ai: false,
  });
}

export async function POST(request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expected) return Response.json({ ok: false }, { status: 401 });
  }

  const update = await request.json();
  const origin = new URL(request.url).origin;
  waitUntil(processUpdate(origin, update));
  return Response.json({ ok: true });
}
