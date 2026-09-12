import { waitUntil } from "@vercel/functions";
import {
  isAddressedToTeddy,
  isGroupMessage,
  isStaffChat
} from "../../../../ark-writing-bot/lib/agents/config.js";
import { handleStaffManagerMessage } from "../../../../ark-writing-bot/lib/agents/manager.js";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const incoming = incomingFrom(update);
  if (!incoming?.chatId) {
    await forwardToLegacy(origin, update);
    return;
  }

  const { message } = incoming;
  if (message.from?.is_bot || message.sender_business_bot) return;

  if (isStaffChat(message)) {
    if (message.document || message.photo?.length || message.voice || message.audio) {
      return;
    }
    if (message.text || message.caption) {
      await handleStaffManagerMessage(incoming);
    }
    return;
  }

  if (isGroupMessage(message) && !isAddressedToTeddy(message)) return;
  await forwardToLegacy(origin, update);
}

export async function GET() {
  return Response.json({ ok: true, service: "Teddy Manager", ready: true });
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
