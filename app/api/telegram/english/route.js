import { waitUntil } from "@vercel/functions";
import { telegram } from "../../../../ark-writing-bot/lib/telegram.js";
import { performStudentAccess } from "../../../../lib/arkEnglishStudentAccess";
import { getServiceSupabase } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const PLATFORM_URL = process.env.ARK_ENGLISH_WEBAPP_URL || "https://ark-video.vercel.app";
const REGISTRATION_TABLE = "telegram_registration_sessions";
const ADMIN_TABLE = "admins";

function cleanName(value, max = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isPrivateMessage(message) {
  return message?.chat?.type === "private";
}

async function studentAccess(_origin, payload) {
  const result = await performStudentAccess(payload);
  if (result.status >= 400) throw new Error(result.data?.error || "Student access xatoligi");
  return result.data;
}

async function getRegistrationSession(telegramId) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from(REGISTRATION_TABLE)
    .select("telegram_id,step,first_name,last_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function setRegistrationSession(telegramId, step, values = {}) {
  const supabase = getServiceSupabase();
  const row = {
    telegram_id: telegramId,
    step,
    first_name: values.first_name ?? null,
    last_name: values.last_name ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(REGISTRATION_TABLE).upsert(row, { onConflict: "telegram_id" });
  if (error) throw error;
}

async function clearRegistrationSession(telegramId) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from(REGISTRATION_TABLE).delete().eq("telegram_id", telegramId);
  if (error) throw error;
}

async function maybeBootstrapRustamAdmin(telegramId, firstName, lastName) {
  if (firstName.trim().toLowerCase() !== "rustam" || lastName.trim().toLowerCase() !== "usmonov") return;

  const supabase = getServiceSupabase();
  const { data: activeAdmins, error: readError } = await supabase
    .from(ADMIN_TABLE)
    .select("id")
    .eq("active", true)
    .limit(1);
  if (readError) throw readError;
  if (activeAdmins?.length) return;

  const { error } = await supabase.from(ADMIN_TABLE).upsert(
    {
      telegram_id: telegramId,
      name: "Rustam Usmonov",
      role: "super_admin",
      active: true,
    },
    { onConflict: "telegram_id" },
  );
  if (error) throw error;
}

async function sendFirstNamePrompt(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "🏛 <b>Ark Education | English</b>",
      "",
      "",
      "<b>English platformasiga xush kelibsiz!</b>",
      "Platformadan foydalanishni boshlash uchun qisqa ro‘yxatdan o‘ting.",
      "",
      "",
      "👤 <b>Ismingizni yozing.</b>",
      "<i>Masalan: Rustam</i>",
    ].join("\n"),
    parse_mode: "HTML",
  });
}

async function sendSurnamePrompt(chatId, firstName) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "✅ <b>Ism qabul qilindi.</b>",
      "",
      "",
      `👤 ${firstName}`,
      "",
      "",
      "<b>Familiyangizni yozing.</b>",
      "<i>Masalan: Usmonov</i>",
    ].join("\n"),
    parse_mode: "HTML",
  });
}

async function sendConfirmation(chatId, firstName, lastName) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "👤 <b>Ma’lumotlaringizni tekshiring</b>",
      "",
      "",
      `<b>Ism:</b> ${firstName}`,
      `<b>Familiya:</b> ${lastName}`,
      "",
      "",
      "Hammasi to‘g‘ri bo‘lsa, tasdiqlang.",
    ].join("\n"),
    parse_mode: "HTML",
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
        "🎉 <b>Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi!</b>",
        "",
        "",
        ...(fullName ? [`👤 <b>${fullName}</b>`, "", ""] : []),
        "Siz endi <b>Ark Education | English</b> platformasidan foydalanishingiz mumkin.",
        "",
        "",
        "Quyidagi tugma orqali platformaga kiring.",
      ].join("\n")
    : [
        "🏛 <b>Ark Education | English</b>",
        "",
        "",
        fullName ? `👋 Xush kelibsiz, <b>${fullName}</b>!` : "👋 Xush kelibsiz!",
        "",
        "",
        "Dashboard, video darslar, testlar, kitoblar va reyting platforma ichida.",
        "",
        "",
        "Quyidagi tugma orqali davom eting.",
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
      await clearRegistrationSession(telegramId);
      const access = await studentAccess(origin, { action: "platform", telegramId, username });
      await sendPlatformEntry(chatId, access.student, access.platformToken, false);
    } else if (profile?.student?.status === "blocked") {
      await telegram("sendMessage", { chat_id: chatId, text: "Profilingiz admin tomonidan bloklangan." });
    } else {
      await setRegistrationSession(telegramId, "first_name");
      await sendFirstNamePrompt(chatId);
    }
    return;
  }

  const session = await getRegistrationSession(telegramId);
  if (session?.step === "first_name") {
    const firstName = cleanName(text, 60);
    if (firstName.length < 2 || firstName.startsWith("/")) {
      await sendFirstNamePrompt(chatId);
      return;
    }
    await setRegistrationSession(telegramId, "last_name", { first_name: firstName });
    await sendSurnamePrompt(chatId, firstName);
    return;
  }

  if (session?.step === "last_name") {
    const firstName = cleanName(session.first_name, 60);
    const lastName = cleanName(text, 80);
    if (!firstName || lastName.length < 2 || lastName.startsWith("/")) {
      await setRegistrationSession(telegramId, "first_name");
      await sendFirstNamePrompt(chatId);
      return;
    }
    await setRegistrationSession(telegramId, "confirm", { first_name: firstName, last_name: lastName });
    await sendConfirmation(chatId, firstName, lastName);
    return;
  }

  if (session?.step === "confirm") {
    await sendConfirmation(chatId, cleanName(session.first_name, 60), cleanName(session.last_name, 80));
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
    await setRegistrationSession(telegramId, "first_name");
    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Ma’lumotlarni qayta kiriting.",
    });
    await sendFirstNamePrompt(chatId);
    return true;
  }

  if (data === "english_reg_confirm") {
    const session = await getRegistrationSession(telegramId);
    const firstName = cleanName(session?.first_name, 60);
    const lastName = cleanName(session?.last_name, 80);
    if (session?.step !== "confirm" || !firstName || !lastName) {
      await setRegistrationSession(telegramId, "first_name");
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
    await maybeBootstrapRustamAdmin(telegramId, firstName, lastName);
    await clearRegistrationSession(telegramId);
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
