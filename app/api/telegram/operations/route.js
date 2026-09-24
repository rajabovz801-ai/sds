import { waitUntil } from "@vercel/functions";
import { handleAgentUpdate } from "../../../../ark-writing-bot/lib/agents/handler.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return Response.json({ ok: true, agent: "operations", ready: true });
}

export async function POST(request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expected) return Response.json({ ok: false }, { status: 401 });
  }
  const update = await request.json();
  waitUntil(handleAgentUpdate("operations", update));
  return Response.json({ ok: true });
}
